import { NextResponse } from 'next/server';

const STEAM_API_BASE = 'https://api.steampowered.com';

function steamUrl(iface: string, method: string, version: string, params: Record<string, string>) {
  const key = process.env.STEAM_API_KEY;
  const url = new URL(`${STEAM_API_BASE}/${iface}/${method}/${version}/`);
  url.searchParams.set('key', key!);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function GET() {
  const apiKey = process.env.STEAM_API_KEY;
  const userId = process.env.STEAM_USER_ID;

  if (!apiKey || !userId) {
    return NextResponse.json(
      { error: 'Steam API is not configured. Set STEAM_API_KEY and STEAM_USER_ID env vars.' },
      { status: 500 }
    );
  }

  // Fetch profile and recent games in parallel.
  // Cast to `RequestInit` to allow the Next.js-specific `next.revalidate` extension.
  const [profileRes, recentRes] = await Promise.all([
    fetch(steamUrl('ISteamUser', 'GetPlayerSummaries', 'v0002', { steamids: userId }),
      { next: { revalidate: 300 } } as RequestInit),
    fetch(steamUrl('IPlayerService', 'GetRecentlyPlayedGames', 'v0001', { steamid: userId, count: '10' }),
      { next: { revalidate: 300 } } as RequestInit),
  ]);

  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Steam profile' }, { status: 502 });
  }

  const profileData = await profileRes.json();
  const player = profileData?.response?.players?.[0] ?? null;

  if (!player) {
    return NextResponse.json({ error: 'Steam user not found' }, { status: 404 });
  }

  let recentGames: unknown[] = [];
  if (recentRes.ok) {
    const recentData = await recentRes.json();
    recentGames = recentData?.response?.games ?? [];
  }

  // Fetch achievements for top 1–2 games by recent playtime
  interface RecentGame {
    appid: number;
    name: string;
    playtime_2weeks?: number;
    playtime_forever: number;
    img_icon_url: string;
    img_logo_url?: string;
  }

  const topGames = (recentGames as RecentGame[])
    .filter((g) => (g.playtime_2weeks ?? 0) > 0)
    .sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0))
    .slice(0, 2);

  interface RawAchievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
  }

  interface AchievementSchema {
    name: string;
    displayName?: string;
    description?: string;
    icon?: string;
    icongray?: string;
  }

  const achievementResults = await Promise.allSettled(
    topGames.map(async (game) => {
      const [statsRes, schemaRes] = await Promise.all([
        fetch(
          steamUrl('ISteamUserStats', 'GetPlayerAchievements', 'v0001', {
            steamid: userId,
            appid: String(game.appid),
            l: 'en',
          }),
          { next: { revalidate: 300 } } as RequestInit
        ),
        fetch(
          steamUrl('ISteamUserStats', 'GetSchemaForGame', 'v0002', {
            appid: String(game.appid),
            l: 'en',
          }),
          { next: { revalidate: 3600 } } as RequestInit
        ),
      ]);

      if (!statsRes.ok) return null;
      const statsData = await statsRes.json();
      const achievements: RawAchievement[] = statsData?.playerstats?.achievements ?? [];
      if (achievements.length === 0) return null;

      // Build lookup from schema for display names + descriptions
      const schemaMap: Record<string, { displayName: string; description: string; icon: string; icongray: string }> = {};
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        const schemaAchievements: AchievementSchema[] =
          schemaData?.game?.availableGameStats?.achievements ?? [];
        for (const s of schemaAchievements) {
          schemaMap[s.name] = {
            displayName: s.displayName ?? s.name,
            description: s.description ?? '',
            icon: s.icon ?? '',
            icongray: s.icongray ?? '',
          };
        }
      }

      const unlocked = achievements.filter((a) => a.achieved === 1);
      const recentlyUnlocked = unlocked
        .sort((a, b) => b.unlocktime - a.unlocktime)
        .slice(0, 5)
        .map((a) => ({
          apiname: a.apiname,
          unlocktime: a.unlocktime,
          displayName: schemaMap[a.apiname]?.displayName ?? a.apiname,
          description: schemaMap[a.apiname]?.description ?? '',
          icon: schemaMap[a.apiname]?.icon ?? '',
        }));

      return {
        appid: game.appid,
        gameName: game.name,
        totalAchievements: achievements.length,
        unlockedAchievements: unlocked.length,
        recentlyUnlocked,
      };
    })
  );

  const achievements = achievementResults
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);

  return NextResponse.json({
    profile: {
      steamid: player.steamid,
      personaname: player.personaname,
      avatarfull: player.avatarfull,
      personastate: player.personastate,
      profileurl: player.profileurl,
      lastlogoff: player.lastlogoff,
      gameextrainfo: player.gameextrainfo ?? null,
    },
    recentGames,
    achievements,
  });
}

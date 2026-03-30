'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { SteamData, RecentGame, GameAchievements } from './types';

const PERSONA_STATES: Record<number, { label: string; color: string }> = {
  0: { label: 'Offline', color: 'bg-gray-400' },
  1: { label: 'Online', color: 'bg-green-500' },
  2: { label: 'Busy', color: 'bg-red-500' },
  3: { label: 'Away', color: 'bg-yellow-500' },
  4: { label: 'Snooze', color: 'bg-yellow-400' },
  5: { label: 'Looking to Trade', color: 'bg-blue-500' },
  6: { label: 'Looking to Play', color: 'bg-blue-400' },
};

function fmtHours(minutes: number): string {
  const h = minutes / 60;
  if (h < 0.1) return '< 0.1 hrs';
  return `${h.toFixed(1)} hrs`;
}

function fmtDate(unixTime: number): string {
  return new Date(unixTime * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function gameIconUrl(appid: number, iconHash: string): string {
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

function ProfileCard({ data }: { data: SteamData }) {
  const { profile } = data;
  const status = PERSONA_STATES[profile.personastate] ?? PERSONA_STATES[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="relative flex-shrink-0">
        <Image
          src={profile.avatarfull}
          alt={`${profile.personaname}'s Steam avatar`}
          width={96}
          height={96}
          className="rounded-full border-4 border-slate-200 dark:border-slate-700"
          unoptimized
        />
        <span
          className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${status.color}`}
          title={status.label}
        />
      </div>
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight">{profile.personaname}</h2>
        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.color}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {profile.gameextrainfo ? `In-Game: ${profile.gameextrainfo}` : status.label}
          </span>
        </div>
        <a
          href={profile.profileurl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Steam Profile →
        </a>
      </div>
    </div>
  );
}

function RecentGamesSection({ games }: { games: RecentGame[] }) {
  if (games.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2">Recently Played</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No games played in the last 2 weeks.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Recently Played</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <a
            key={game.appid}
            href={`https://store.steampowered.com/app/${game.appid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {game.img_icon_url ? (
              <Image
                src={gameIconUrl(game.appid, game.img_icon_url)}
                alt={game.name}
                width={40}
                height={40}
                className="rounded flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{game.name}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {fmtHours(game.playtime_2weeks)} last 2 weeks
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {fmtHours(game.playtime_forever)} total
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AchievementsSection({ achievements }: { achievements: GameAchievements[] }) {
  if (achievements.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Achievements</h2>
      {achievements.map((game) => {
        const pct =
          game.totalAchievements > 0
            ? Math.round((game.unlockedAchievements / game.totalAchievements) * 100)
            : 0;
        return (
          <div key={game.appid} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
              <h3 className="font-bold text-lg">{game.gameName}</h3>
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {game.unlockedAchievements} / {game.totalAchievements} unlocked ({pct}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Recently unlocked */}
            {game.recentlyUnlocked.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Recently Unlocked
                </p>
                <ul className="space-y-2">
                  {game.recentlyUnlocked.map((ach) => (
                    <li key={ach.apiname} className="flex items-start gap-3">
                      {ach.icon ? (
                        <Image
                          src={ach.icon}
                          alt={ach.displayName}
                          width={32}
                          height={32}
                          className="rounded flex-shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{ach.displayName}</p>
                        {ach.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                            {ach.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Unlocked {fmtDate(ach.unlocktime)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 last:mb-0" />
      ))}
    </div>
  );
}

export default function SteamProfile() {
  const [data, setData] = useState<SteamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/steam')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load Steam data');
        return json as SteamData;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="font-semibold text-red-700 dark:text-red-400">Could not load Steam data</p>
        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <ProfileCard data={data} />
      <RecentGamesSection games={data.recentGames} />
      <AchievementsSection achievements={data.achievements} />
    </div>
  );
}

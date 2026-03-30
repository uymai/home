export interface SteamProfile {
  steamid: string;
  personaname: string;
  avatarfull: string;
  personastate: number; // 0=offline,1=online,2=busy,3=away,4=snooze,5=lookingToTrade,6=lookingToPlay
  profileurl: string;
  lastlogoff?: number;
  gameextrainfo?: string | null; // currently playing game name, if any
}

export interface RecentGame {
  appid: number;
  name: string;
  playtime_2weeks: number; // minutes
  playtime_forever: number; // minutes
  img_icon_url: string;
  img_logo_url?: string;
}

export interface RecentAchievement {
  apiname: string;
  unlocktime: number;
  displayName: string;
  description: string;
  icon: string;
}

export interface GameAchievements {
  appid: number;
  gameName: string;
  totalAchievements: number;
  unlockedAchievements: number;
  recentlyUnlocked: RecentAchievement[];
}

export interface SteamData {
  profile: SteamProfile;
  recentGames: RecentGame[];
  achievements: GameAchievements[];
}

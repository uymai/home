import WarpProtocolClient from './WarpProtocolClient';
import { GameMode } from './types';
import { generateDailySeed } from './engine';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WarpProtocolPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const rawSeed = params?.seed;
  const rawMode = params?.mode;
  const rawDate = params?.date;
  const seed = Array.isArray(rawSeed) ? rawSeed[0] : rawSeed;
  const modeValue = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  const dateValue = Array.isArray(rawDate) ? rawDate[0] : rawDate;
  const mode: GameMode = modeValue === 'seeded' || modeValue === 'daily' ? modeValue : 'random';
  const resolvedDailyDate = dateValue ?? new Date().toISOString().slice(0, 10);
  const dailyDate = mode === 'daily' ? resolvedDailyDate : undefined;
  const initialSeed = mode === 'daily' ? generateDailySeed(resolvedDailyDate) : seed;

  return <WarpProtocolClient initialSeed={initialSeed} initialMode={mode} initialDailyDate={dailyDate} />;
}

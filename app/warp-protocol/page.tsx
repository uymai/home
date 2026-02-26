import WarpProtocolClient from './WarpProtocolClient';

type PageProps = {
  searchParams?: Promise<{ seed?: string | string[] }>;
};

export default async function WarpProtocolPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const rawSeed = params?.seed;
  const seed = Array.isArray(rawSeed) ? rawSeed[0] : rawSeed;

  return <WarpProtocolClient initialSeed={seed} />;
}

import type { Metadata } from 'next';
import StevesGameClient from './StevesGameClient';

export const metadata: Metadata = {
  title: "Steve's Game",
  description: "Steve picks a number 1–100. Can you beat Steve?",
};

export default function StevesGamePage() {
  return <StevesGameClient />;
}

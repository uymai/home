import NightlightClient from './NightlightClient';

export const metadata = { title: 'Nightlight' };

export default function NightlightPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <NightlightClient />
    </div>
  );
}

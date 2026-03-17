import Footer from "../components/Footer";
import Header from "../components/Header";
import MagicSquareGenerator from "../components/MagicSquareGenerator";

export default function MagicSquarePage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Magic Square"
        subtitle="A one-off generator for building 4 x 4 magic squares with a custom target sum"
      />

      <MagicSquareGenerator />

      <Footer />
    </div>
  );
}

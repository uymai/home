import Footer from "../components/Footer";
import Header from "../components/Header";
import NumberGridVisualizer from "../components/NumberGridVisualizer";

export default function NumberGridPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Number Grid"
        subtitle="Visualize skip counting, primes, and Fibonacci numbers"
      />
      <NumberGridVisualizer />
      <Footer />
    </div>
  );
}

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import BigOVisualizer from "./BigOVisualizer";

export default function BigOPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Big O Complexity"
        subtitle="Visualize and compare time complexity curves, with code examples and a speed-improvement calculator"
      />
      <BigOVisualizer />
      <Footer />
    </div>
  );
}

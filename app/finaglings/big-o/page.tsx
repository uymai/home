import Footer from "../../components/Footer";
import Header from "../../components/Header";
import BigOVisualizer from "./BigOVisualizer";

export default function BigOPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Big O Complexity"
        subtitle="How much slower does a program get when you give it more to do? See the curves, read the code, and find out."
      />
      <BigOVisualizer />
      <Footer />
    </div>
  );
}

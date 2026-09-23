import Footer from "../../components/Footer";
import Header from "../../components/Header";
import SortingAlgorithmsClient from "./SortingAlgorithmsClient";

export default function SortingAlgorithmsPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Sorting Algorithms"
        subtitle="Six ways to put a list in order, with animations, Python code, and easy explanations"
      />
      <SortingAlgorithmsClient />
      <Footer />
    </div>
  );
}

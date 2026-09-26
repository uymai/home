import Footer from "../../components/Footer";
import Header from "../../components/Header";
import BinaryExplainer from "./BinaryExplainer";

export default function BinaryPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <Header
        title="Binary Numbers"
        subtitle="How computers count with just 0 and 1, and how you can count to 31 on one hand"
      />
      <BinaryExplainer />
      <Footer />
    </div>
  );
}

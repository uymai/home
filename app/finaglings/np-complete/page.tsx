import Footer from "../../components/Footer";
import Header from "../../components/Header";
import NPCompleteExplainer from "./NPCompleteExplainer";

export default function NPCompletePage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <Header
        title="NP-Complete"
        subtitle="The hardest problems in math — explained for a 10-year-old"
      />
      <NPCompleteExplainer />
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import NPCompleteExplainer from "./NPCompleteExplainer";

export const metadata: Metadata = {
  title: "NP-Complete",
  description: "P vs NP and the hardest problems in computer science, explained for kids.",
};

export default function NPCompletePage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <Header
        title="NP-Complete"
        subtitle="P vs NP and the hardest problems in computer science, explained for kids"
      />
      <NPCompleteExplainer />
      <Footer />
    </div>
  );
}

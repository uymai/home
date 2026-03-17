import Footer from "../components/Footer";
import Header from "../components/Header";
import LinkCard from "../components/LinkCard";

export default function FinaglingsPage() {
  const projects = [
    {
      title: "Warp Protocol",
      description: "A self-contained protocol game experiment with its own rules, state, and play loop.",
      url: "/warp-protocol",
      icon: "/window.svg",
      color: "bg-sky-100 dark:bg-sky-950",
    },
    {
      title: "Magic Square",
      description: "A one-off number toy that generates 4 x 4 magic squares for custom target sums.",
      url: "/magic-square",
      icon: "/globe.svg",
      color: "bg-cyan-100 dark:bg-cyan-950",
    },
  ];

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Finaglings"
        subtitle="One-off projects, prototypes, and side experiments that deserve a home of their own"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {projects.map((project, index) => (
          <LinkCard
            key={index}
            title={project.title}
            description={project.description}
            url={project.url}
            icon={project.icon}
            color={project.color}
          />
        ))}
      </div>

      <Footer />
    </div>
  );
}

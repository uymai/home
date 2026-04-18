import Footer from "../components/Footer";
import Header from "../components/Header";
import LinkCard from "../components/LinkCard";
import SkillCard from "../components/SkillCard";

export default function FinaglingsPage() {
  const projects = [
    {
      title: "Steve's Game",
      description: "Steve picks a number 1–100. Earn $5 for a first-guess win, losing $1 for each additional try. Can you beat Steve?",
      url: "/steves-game",
      icon: "/window.svg",
      color: "bg-amber-100 dark:bg-amber-950",
    },
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
    {
      title: "Mealstorm",
      description: "A dinner planner side project for figuring out what to make before the week gets away from you.",
      url: "https://uymai.github.io/mealstorm/",
      icon: "/next.svg",
      color: "bg-emerald-100 dark:bg-emerald-950",
    },
    {
      title: "Tally Rally",
      description: "A shared todo list, but with points!",
      url: "https://tallyrally.uymai.net",
      icon: "/window.svg",
      color: "bg-violet-100 dark:bg-violet-950",
    },
    {
      title: "Warp Protocol Dark Pulse",
      description: "A more recent finagling crossed with a really old school project.",
      url: "https://warp-protocol-dark-pulse.uymai.net",
      icon: "/window.svg",
      color: "bg-slate-100 dark:bg-slate-950",
    },
    {
      title: "Number Grid",
      description: "Visualize numbers 1–1000 with highlights for skip counting, primes, and Fibonacci numbers.",
      url: "/number-grid",
      icon: "/window.svg",
      color: "bg-indigo-100 dark:bg-indigo-950",
    },
    {
      title: "Big O Complexity",
      description: "Visualize time complexity curves for all common Big O notations, with code examples and a speed-improvement calculator.",
      url: "/finaglings/big-o",
      icon: "/window.svg",
      color: "bg-violet-100 dark:bg-violet-950",
    },
  ];

  const claudeSkills = [
    {
      title: "Setlist to Apple Music",
      description: "Paste in a setlist and it adds the songs to a playlist in Apple Music using AppleScript.",
      filename: "setlist-to-apple-music.md",
      note: "I'm sure there's an easier way, but here's how I roll.",
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

      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-2">Claude Skills</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Custom skills I&apos;ve made for{" "}
          <a
            href="https://claude.ai/code"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 dark:hover:text-gray-100"
          >
            Claude Code
          </a>
          . Drop a <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">.md</code> file into your project&apos;s <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">skills/</code> folder and it becomes a slash command.
        </p>
        <div className="flex flex-col gap-4">
          {claudeSkills.map((skill, index) => (
            <SkillCard key={index} {...skill} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

import LinkCard from "./components/LinkCard";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function Home() {
  // You can customize these links based on what you want to direct people to
  const links = [
  
    {
      title: "GitHub",
      description: "Explore my open source projects and contributions",
      url: "https://github.com/uymai",
      icon: "/file.svg",
      color: "bg-gray-100 dark:bg-gray-900"
    },
    {
      title: "Mastodon",
      description: "Follow me for updates, thoughts, and discussions",
      url: "https://mstdn.io/@uymai",
      icon: "/next.svg",
      color: "bg-purple-100 dark:bg-purple-950"
    },
    {
      title: "Discord",
      description: "Join me on Discord, where I hang out and chat in various servers",
      url: "/discord",
      icon: "/discord.svg",
      color: "bg-indigo-100 dark:bg-indigo-950"
    }
  ];

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header 
        title="uymai.net" 
        subtitle="Personal directory for all my links and resources"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map((link, index) => (
          <LinkCard
            key={index}
            title={link.title}
            description={link.description}
            url={link.url}
            icon={link.icon}
            color={link.color}
          />
        ))}
      </div>
      
      <Footer />
    </div>
  );
}

import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LinkCard from '../components/LinkCard';

export default function Gaming() {
  const gamingProfiles = [
    {
      title: "Xbox",
      description: "Check out my Xbox profile, achievements, and games",
      url: "https://account.xbox.com/profile?gamertag=YourGamertag", // Replace with actual Xbox profile
      icon: "/xbox.svg",
      color: "bg-green-100 dark:bg-green-950"
    },
    {
      title: "Steam",
      description: "Check out my Steam profile and games collection",
      url: "https://steamcommunity.com/id/yoursteamid", // Replace with actual Steam profile
      icon: "/window.svg",
      color: "bg-slate-100 dark:bg-slate-900"
    },
    {
      title: "Twitch",
      description: "Watch my occasional game streams",
      url: "https://twitch.tv/yourtwitchname", // Replace with actual Twitch profile
      icon: "/globe.svg",
      color: "bg-purple-100 dark:bg-purple-950"
    },
    {
      title: "Discord Servers",
      description: "Join my favorite gaming communities on Discord",
      url: "#discord-servers",
      icon: "/discord.svg",
      color: "bg-indigo-100 dark:bg-indigo-950"
    }
  ];

  const discordServers = [
    {
      name: "Game Development",
      description: "A community for indie game developers",
      inviteLink: "https://discord.gg/example1" // Replace with actual invite link
    },
    {
      name: "Gaming Discussions",
      description: "Chat about the latest games and gaming news",
      inviteLink: "https://discord.gg/example2" // Replace with actual invite link
    },
    {
      name: "Speedrunning",
      description: "Community focused on speedrunning various games",
      inviteLink: "https://discord.gg/example3" // Replace with actual invite link
    }
  ];

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header 
        title="Gaming Profiles" 
        subtitle="My gaming presence across platforms"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {gamingProfiles.map((profile, index) => (
          <LinkCard
            key={index}
            title={profile.title}
            description={profile.description}
            url={profile.url}
            icon={profile.icon}
            color={profile.color}
          />
        ))}
      </div>
      
      <div id="discord-servers" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Discord Servers I&apos;m Active In</h2>
        <div className="space-y-6">
          {discordServers.map((server, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
              <h3 className="font-bold text-lg mb-2">{server.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{server.description}</p>
              <a 
                href={server.inviteLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Join Server
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <Link 
          href="/"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to homepage
        </Link>
      </div>
      
      <Footer />
    </div>
  );
} 

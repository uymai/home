import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DiscordIcon from '../components/DiscordIcon';

export default function Discord() {
  const discordServers = [
   
    {
      name: "Dadia",
      description: "A casual gaming server for adults looking to interact with other like-minded adults",
      inviteLink: "https://discord.gg/invite/zHD2vbYtka", 
      category: "Gaming"
    },
    {
      name: "5by5 DLC",
      description: "Official discord server for Jeff Cannata and Christian Spicer's podcast DLC",
      inviteLink: "https://discord.gg/invite/Xx8tthZkEK", 
      category: "Gaming"
    },
    {
      name: "Reddit Parenting",
      description: "a discord server for parents to discuss parenting and raising children",
      inviteLink: "https://discord.gg/invite/8AG5fZc", 
      category: "Other"
    }
  ];

  // Group servers by category
  const groupedServers = discordServers.reduce((acc, server) => {
    if (!acc[server.category]) {
      acc[server.category] = [];
    }
    acc[server.category].push(server);
    return acc;
  }, {} as Record<string, typeof discordServers>);

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header 
        title="Discord Communities" 
        subtitle="Join me in these Discord servers"
      />
      
      <div className="mb-12 max-w-4xl mx-auto bg-indigo-50 dark:bg-indigo-950 p-8 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <DiscordIcon className="h-8 w-8 mr-3 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold">My Discord Profile</h2>
        </div>
        <p className="mb-4">I&apos;m active on Discord under the username <span className="font-bold">uymai</span>. Feel free to add me!</p>
        <p className="mb-4">I mostly hang out in servers related to technology, gaming, and creative pursuits. Check out some of my favorite servers below.</p>
        
        <div className="mt-6">
          <a 
            href="https://discord.com/users/uymai" // Replace with your actual Discord profile link
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <DiscordIcon className="h-5 w-5 mr-2" />
            Add Me on Discord
          </a>
        </div>
      </div>
      
      {Object.entries(groupedServers).map(([category, servers]) => (
        <div key={category} className="mb-12">
          <h3 className="text-xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">{category} Servers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {servers.map((server, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h4 className="font-bold text-lg mb-2">{server.name}</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{server.description}</p>
                <a 
                  href={server.inviteLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
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
      ))}
      
      <div className="mt-8 text-center">
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

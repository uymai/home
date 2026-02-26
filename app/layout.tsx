import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rob | Personal Links & Resources",
  description: "A central hub for all my links, projects, and ways to connect with me",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

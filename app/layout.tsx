import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarDemo } from "@/components/aceternity/SideBarDemo";
import MusicPlayer from "@/components/music-player/MusicPlayer";
import QueryProvider from "@/lib/TanStackQuery/QueryProvider";
import PlaylistWindow from "@/components/PlayList/PlaylistWindow";
import { TopBanner } from "@/components/notification/TopBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mudit - Music Editing App",
  description: "Edite, create, and share your favorite music effortlessly.",
  themeColor: "#7c3aed",
  alternates: {
    canonical: "",
  },
  openGraph: {
    title: "Mudit - Music Editing App",
    description: "Edite, create, and share your favorite music effortlessly.",
    url: "https://my-music-app.com",
    siteName: "Mudit - Music Editing App",
    type: "website",
    images: [
      {
        url: "/logoDark.png",
        width: 1200,
        height: 630,
        alt: "Mudit - Music Editing App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mudit - Music Editing App",
    description: "Edite, create, and share your favorite music effortlessly.",
    images: ["/logoDark.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
          <head>
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/logoDark.png" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col antialiased h-screen w-full dark p-1`}
      >
        <QueryProvider>
          <TopBanner />
          <div className="flex flex-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-400 dark:border-neutral-700 relative z-50 dark:bg-neutral-800">
            <div className="flex flex-1  max-md:overflow-x-hidden md:overflow-hidden ">
              <SidebarDemo>
                {children}
              </SidebarDemo>
            </div>
            <PlaylistWindow />
          </div>
          <MusicPlayer />
        </QueryProvider>
      </body>
    </html>
  );
}

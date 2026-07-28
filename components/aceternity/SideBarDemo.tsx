"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarAction, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
  IconBrandTabler,
  IconEdit,
  IconLogout,
  IconMusic,
  IconPlaylist,
  IconPlaylistAdd,
  IconPlus,
  IconUserCircle,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { queryClient } from "@/lib/TanStackQuery/queryClient";

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarDemo({ children }: SidebarLayoutProps) {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) setOpen(false);
  }, [pathname]);

  const handleLogOut = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
    } catch (err) {
      console.log(err);
    }
  };

  const links = [
    { label: "Home",                href: "/",                 icon: <IconBrandTabler  className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Profile",             href: "/profile",          icon: <IconUserCircle   className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Create new playlist", href: "/createPlaylist",   icon: <IconPlus         className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Add new Tracks",      href: "/createSong",       icon: <IconPlaylistAdd  className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "My Tracks",           href: "/tracks",           icon: <IconMusic        className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "My Playlists",        href: "/playlists",        icon: <IconPlaylist     className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Edit",                href: "/edit/updateTrack", icon: <IconEdit         className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
  ];

  return (
    <div className={cn("md:flex w-full h-screen bg-white dark:bg-neutral-900 transition-colors")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 relative overflow-hidden">

          {/* Artistic ghost wordmark — same low-opacity, oversized treatment as
              the rank numbers on the Trending chart cards, rotated vertical so
              it reads like a spine label running the height of the sidebar.
              Purely decorative: pointer-events-none, sits behind the nav links. */}
          <div
            aria-hidden
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0"
          >
            <span
              className="text-7xl font-black italic tracking-tighter whitespace-nowrap
                text-neutral-900/[0.05] dark:text-white/[0.06]"
              style={{ writingMode: "vertical-rl" }}
            >
              MUDIT
            </span>
          </div>

          <div className="relative z-10 mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}

            {user ? (
              <SidebarAction
                label="Logout"
                icon={<IconLogout className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />}
                onClick={handleLogOut}
              />
            ) : (
              <SidebarLink
                link={{
                  label: "Login",
                  href: "/login",
                  icon: <IconLogout className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200 rotate-180" />,
                }}
              />
            )}
          </div>

          {user && (
            <div className="relative z-10 flex flex-col items-center p-2">
              <SidebarLink
                link={{
                  label: user.username,
                  href: "/profile",
                  icon: (
                    <img
                      src={user.profileImageUrl || "https://assets.aceternity.com/manu.png"}
                      className="h-10 w-10 rounded-full object-cover"
                      width={50}
                      height={50}
                      alt="Avatar"
                    />
                  ),
                }}
              />
            </div>
          )}
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 transition-colors">{children}</div>
    </div>
  );
}

export const Logo = () => (
  <a href="#" className="flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 bg-black rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm dark:bg-white" />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-black dark:text-white">
      Acet Labs
    </motion.span>
  </a>
);

export const LogoIcon = () => (
  <a href="#" className="flex items-center space-x-2 py-1 text-sm font-normal text-black">
    <div className="h-5 w-6 bg-black rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm dark:bg-white" />
  </a>
);
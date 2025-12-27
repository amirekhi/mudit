"use client";

import React, { useState, ReactNode } from "react";
import { Sidebar, SidebarAction, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconEdit,
  IconLogout,
  IconPlaylistAdd,
  IconPlus,
  IconSettings,
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
  const { data: user } = useCurrentUser(); // user: CurrentUser | null
  const [open, setOpen] = useState(false);

  const handleLogOut = async () => {
    try {
      // no need to use authFetch btw
      authFetch("/api/auth/logout" , {method : "POST"});
      queryClient.setQueryData(["current-user"], null); 
    }catch(err){
      console.log(err);
    }
  }

  const links = [
    { label: "Home", href: "/", icon: <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Profile", href: "/profile", icon: <IconUserCircle className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Create new playlist", href: "/createPlaylist", icon: <IconPlus className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Add new Tracks", href: "/createSong", icon: <IconPlaylistAdd className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />},
    { label: "Edit", href: "/edit", icon: <IconEdit className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />},
    
  ];

  return (
    <div className={cn("md:flex w-full h-screen overflow-hidden")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}

            <SidebarAction
              label="Logout"
              icon={
                <IconLogout className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
              }
              onClick={handleLogOut}
            />
          </div>


          {user && (
            <div className="flex flex-col items-center p-2">
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

      <div className="flex-1 overflow-y-auto">{children}</div>
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

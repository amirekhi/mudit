"use client";

import React, { useState, ReactNode } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarDemo({ children }: SidebarLayoutProps) {
  const { data: user } = useCurrentUser(); // user: CurrentUser | null
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Dashboard", href: "#", icon: <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Profile", href: "#", icon: <IconUserBolt className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Settings", href: "#", icon: <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
    { label: "Logout", href: "#", icon: <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> },
  ];

  return (
    <div className={cn("md:flex w-full h-screen overflow-hidden")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          {user && (
            <div className="flex flex-col items-center p-2">
              <SidebarLink
                link={{
                  label: user.username,
                  href: "#",
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

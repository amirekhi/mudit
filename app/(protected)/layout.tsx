"use client";

import { AuthGate } from "@/components/boundries/AuthGate";
import { ReactNode } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}

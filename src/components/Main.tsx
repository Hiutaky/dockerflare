"use client";

import { ReactNode } from "react";
import Boot from "./Boot";
import { useDocker } from "@/providers/docker.provider";

export default function Main({ children }: { children: ReactNode }) {
  const { loadState, firstRun } = useDocker();
  return (
    <main className="flex-1 p-6 overflow-auto pb-12">
      {loadState !== "ready" && !firstRun ? <Boot /> : children}
    </main>
  );
}

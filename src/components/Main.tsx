"use client";

import { ReactNode } from "react";
import Boot from "./Boot";
import { Breadcrumbs } from "./Breadcrumbs";
import { useDocker } from "@/providers/docker.provider";
import TerminalsManager from "./terminal/TerminalsManager";

export default function Main({ children }: { children: ReactNode }) {
  const { loadState, firstRun } = useDocker();
  const isLoading = loadState !== "ready" && !firstRun;

  return (
    <main className="relative min-w-0 flex flex-col max-h-[calc(100vh-3.5rem)] justify-between">
      <div className="flex-1 p-6 overflow-y-scroll">
        <Breadcrumbs />
        {children}
      </div>
      <TerminalsManager />

      {/* Boot notification overlay - only visible during loading */}
      {isLoading && <Boot />}
    </main>
  );
}

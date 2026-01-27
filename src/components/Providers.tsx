"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { trpc } from "@/lib/trpc-client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DockerProvider } from "@/providers/docker.provider";
import { TerminalsProvider } from "@/providers/terminals.provider";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <DockerProvider>
              <TerminalsProvider>{children}</TerminalsProvider>
              <Toaster />
            </DockerProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

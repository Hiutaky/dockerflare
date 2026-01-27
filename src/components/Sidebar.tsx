"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Box,
  Rocket,
  FileText,
  Image,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Hosts",
    href: "/hosts",
    icon: Server,
  },
  {
    title: "Containers",
    href: "/containers",
    icon: Box,
  },
  {
    title: "Images",
    href: "/images",
    icon: Image,
  },
  {
    title: "Deploy",
    href: "/deploy",
    icon: Rocket,
  },
  {
    title: "Docs",
    href: "/docs",
    icon: FileText,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("w-64 border-r border-border bg-card", className)}>
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 font-normal",
                      isActive
                        ? "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

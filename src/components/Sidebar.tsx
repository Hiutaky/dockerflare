"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Server,
  Box,
  Rocket,
  FileText,
  Image,
  HardDrive,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
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
    title: "Volumes",
    href: "/volumes",
    icon: HardDrive,
  },
  {
    title: "Networks",
    href: "/networks",
    icon: Network,
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

// Shared sidebar content component
function SidebarContent({
  isCollapsed,
  isMobile,
  toggleCollapse,
  setIsOpen,
  pathname,
}: {
  isCollapsed: boolean;
  isMobile: boolean;
  toggleCollapse: () => void;
  setIsOpen: (open: boolean) => void;
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col gap-2 ">
      <div className="flex-1 overflow-hidden flex flex-col justify-between">
        <div className="flex flex-col gap-3 py-3">
          <nav className="grid gap-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              const button = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-normal",
                      isCollapsed && !isMobile ? "gap-3 px-3" : "gap-3",
                      isActive
                        ? "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed || isMobile ? item.title : ``}
                  </Button>
                </Link>
              );

              if (isCollapsed && !isMobile) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent>{item.title}</TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </nav>
        </div>
        {/* Collapse toggle button - only show on desktop */}
        {!isMobile && (
          <div
            className={`flex px-3 py-2  ${isCollapsed ? "justify-center" : "justify-end "}`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("sidebar-collapsed") === "true"
      : false,
  );
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [isOpen, setIsOpen] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem("sidebar-collapsed", newCollapsed.toString());
  };

  // Mobile view with hamburger menu
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-16 left-4 z-40 h-8 w-8 bg-background border shadow-sm"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            toggleCollapse={toggleCollapse}
            setIsOpen={setIsOpen}
            pathname={pathname}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop view with collapsible sidebar
  return (
    <div
      className={cn(
        "border-r border-border bg-card transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <SidebarContent
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        toggleCollapse={toggleCollapse}
        setIsOpen={setIsOpen}
        pathname={pathname}
      />
    </div>
  );
}

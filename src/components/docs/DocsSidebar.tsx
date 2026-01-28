"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FileText, Folder, Menu, X } from "lucide-react";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
}

interface DocsSidebarProps {
  className?: string;
  navItems: NavItem[];
}

function NavItemComponent({
  item,
  level = 0,
}: {
  item: NavItem;
  level?: number;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.items && item.items.length > 0;
  const isActive =
    pathname === item.href ||
    (item.items?.some((child) => pathname === child.href) && !hasChildren);

  return (
    <div>
      {hasChildren ? (
        <>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            style={{ paddingLeft: `${12 + level * 8}px` }}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              isActive &&
                "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary",
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-90",
              )}
            />
            <Folder className="h-4 w-4 text-blue-500" />
            <span className="truncate">{item.title}</span>
          </Button>
          {isOpen && (
            <div>
              {item.items?.map((child) => (
                <NavItemComponent
                  key={child.href}
                  item={child}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <Link href={item.href}>
          <Button
            variant="ghost"
            style={{ paddingLeft: `${24 + level * 8}px` }}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              isActive
                ? "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="truncate">{item.title}</span>
          </Button>
        </Link>
      )}
    </div>
  );
}

export function DocsSidebar({ className, navItems }: DocsSidebarProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed right-3 top-3 z-[999]"
        onClick={() => setIsMobileSidebarOpen(true)}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open documentation menu</span>
      </Button>

      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "w-64 border-r border-border bg-card",
          "lg:relative lg:block",
          "fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* Mobile close button */}
        <div className="mt-[3.5rem] lg:hidden flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-lg font-semibold tracking-tight">
            Documentation
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-full flex-col gap-2 p-3 lg:pt-3 lg:border-0 border-t border-border">
          <div className="flex-1 overflow-auto">
            <nav className="flex flex-col gap-1">
              {/* Desktop title - hidden on mobile since it's in the header */}
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold tracking-tight">
                  Documentation
                </h2>
                <Link href="/docs">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 font-normal"
                  >
                    <FileText className="h-4 w-4" />
                    Overview
                  </Button>
                </Link>
              </div>
              {/* Overview link for mobile */}
              <div className="lg:hidden">
                <Link href="/docs">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 font-normal"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Overview
                  </Button>
                </Link>
              </div>
              {navItems.map((item) => (
                <div
                  key={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <NavItemComponent item={item} />
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

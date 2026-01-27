"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FileText, Folder } from "lucide-react";
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
            className={cn(
              "w-full justify-start gap-2 font-normal pl-6",
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
            <div className="ml-2">
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
            className={cn(
              "w-full justify-start gap-2 font-normal pl-6",
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
  return (
    <div className={cn("w-64 border-r border-border bg-card", className)}>
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-3">
            <div className="mb-4 px-3 py-2">
              <h2 className="mb-2 px-3 text-lg font-semibold tracking-tight">
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
            {navItems.map((item) => (
              <NavItemComponent key={item.href} item={item} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

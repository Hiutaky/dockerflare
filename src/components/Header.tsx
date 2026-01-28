import { Cloud, BookOpen, Bell, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearchTrigger } from "./GlobalSearch";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import Link from "next/link";
import { api } from "@/lib/trpc-server";

export async function Header() {
  // TODO: Connect to real notifications endpoint
  const notificationCount = 0; // Would come from API

  const currentUser = await api.docker.getCurrentUser.query();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Dockerflare</h1>
        </Link>
        <div className="flex flex-1 items-center justify-between gap-4 ml-8">
          {/* Global Search - hidden on mobile */}
          <GlobalSearchTrigger />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Docs */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:flex"
            >
              <Link href="/docs">
                <BookOpen className="h-4 w-4 mr-2" />
                Docs
              </Link>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Badge>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationCount === 0 ? (
                  <DropdownMenuItem disabled>
                    No new notifications
                  </DropdownMenuItem>
                ) : (
                  // TODO: Implement real notifications
                  <DropdownMenuItem>Sample notification</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 rounded-full"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.name || "Loading..."}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <span className="text-xs text-muted-foreground px-2">
                  Connected via Cloudflare Token
                </span>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

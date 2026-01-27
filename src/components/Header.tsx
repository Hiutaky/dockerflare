import { Cloud, BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Dockerflare</h1>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Docs
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

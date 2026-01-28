"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Server,
  Container,
  Image,
  HardDrive,
  Network,
  Terminal,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTerminals } from "@/providers/terminals.provider";

interface SearchResult {
  id: string;
  type: string;
  name: string;
  url: string;
  category: string;
  host?: string;
}

// Icon mapping for different entity types
const getEntityIcon = (type: string) => {
  switch (type) {
    case "host":
      return <Server className="h-4 w-4" />;
    case "container":
      return <Container className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    case "volume":
      return <HardDrive className="h-4 w-4" />;
    case "network":
      return <Network className="h-4 w-4" />;
    default:
      return <Search className="h-4 w-4" />;
  }
};

const getEntityRoute = (type: string, id: string) => {
  switch (type) {
    case "host":
      return `/hosts/${id}`;
    case "container":
      return `/containers/${id}`;
    default:
      return "#"; // For now, other entities don't have detail pages
  }
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { createTerminal } = useTerminals();
  const [query, setQuery] = React.useState("");

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search API call
  const { data: searchResults, isLoading } = trpc.docker.search.useQuery(
    { query: debouncedQuery, limit: 10 },
    {
      enabled: debouncedQuery.length > 0,
    },
  );

  // Group results by category
  const groupedResults = React.useMemo(() => {
    if (!searchResults) return {};

    return searchResults.reduce(
      (acc, result) => {
        const category = result.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(result);
        return acc;
      },
      {} as Record<string, SearchResult[]>,
    );
  }, [searchResults]);

  const handleSelect = (result: SearchResult, action?: string) => {
    onOpenChange(false);

    if (action === "terminal" && result.type === "container") {
      createTerminal(result.url, result.id);
      return;
    }

    const route = getEntityRoute(result.type, result.id);
    if (route !== "#") {
      router.push(route);
    }
  };

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search hosts, containers, images, volumes, networks..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {Object.keys(groupedResults).length > 0 && (
          <>
            {(Object.entries(groupedResults) as [string, SearchResult[]][]).map(
              ([category, results]) => (
                <CommandGroup key={category} heading={category}>
                  {results.map((result) => {
                    if (result.type === "container") {
                      // For containers, show multiple actions
                      return (
                        <React.Fragment key={`${result.type}-${result.id}`}>
                          <CommandItem
                            value={`${result.type}-${result.id}-view`}
                            onSelect={() => handleSelect(result)}
                          >
                            <div className="flex items-center w-full">
                              {getEntityIcon(result.type)}
                              <span className="ml-2 flex-1">{result.name}</span>
                              <span className="text-muted-foreground text-xs mr-2">
                                View container
                              </span>
                              {result.host && (
                                <span className="ml-auto text-muted-foreground text-xs">
                                  {result.host}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                          <CommandItem
                            value={`${result.type}-${result.id}-terminal`}
                            onSelect={() => handleSelect(result, "terminal")}
                          >
                            <div className="flex items-center w-full ml-6">
                              <Terminal className="h-3 w-3" />
                              <span className="ml-2 flex-1">
                                Create terminal
                              </span>
                              {result.host && (
                                <span className="ml-auto text-muted-foreground text-xs">
                                  {result.host}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        </React.Fragment>
                      );
                    }

                    // For other entities, show single item
                    return (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                      >
                        {getEntityIcon(result.type)}
                        <span className="ml-2">{result.name}</span>
                        {result.host && (
                          <span className="ml-auto text-muted-foreground text-xs">
                            {result.host}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ),
            )}
          </>
        )}

        {!query && (
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => router.push("/hosts")}>
              <Server className="h-4 w-4" />
              <span className="ml-2">View all hosts</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/containers")}>
              <Container className="h-4 w-4" />
              <span className="ml-2">View all containers</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/images")}>
              <Image className="h-4 w-4" />
              <span className="ml-2">View all images</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/volumes")}>
              <HardDrive className="h-4 w-4" />
              <span className="ml-2">View all volumes</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/networks")}>
              <Network className="h-4 w-4" />
              <span className="ml-2">View all networks</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// GlobalSearchTrigger component for easier usage in Header
export function GlobalSearchTrigger() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

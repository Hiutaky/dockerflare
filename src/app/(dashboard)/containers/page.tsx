"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Search,
  Server,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  PauseCircle,
  X,
  Filter,
  Grid3x3,
  List,
  Terminal,
  Rocket,
} from "lucide-react";
import { useDocker } from "@/providers/docker.provider";
import { ContainerState, NormalizedContainer } from "@/types";
import { RouterOutputs } from "@/lib/routers";
import { useTerminals } from "@/providers/terminals.provider";
import Link from "next/link";

type Host = RouterOutputs["docker"]["getHosts"][number];

const getStatusBadgeVariant = (state: string) => {
  switch (state.toLowerCase()) {
    case "running":
      return "running";
    case "stopped":
    case "exited":
    case "dead":
      return "stopped";
    case "paused":
      return "paused";
    default:
      return "secondary";
  }
};

const formatContainerName = (names?: string[]) => {
  if (!names || names.length === 0) return "Unnamed";
  return names[0].replace(/\//g, "");
};

export default function ContainersPage() {
  const router = useRouter();
  const { hosts, getContainers, refreshContainers, isLoading } = useDocker();
  const { createTerminal } = useTerminals();
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<
    Set<ContainerState | "dead">
  >(new Set());
  const [imageFilter, setImageFilter] = useState("");
  const [portFilter, setPortFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [containers, setContainers] = useState<NormalizedContainer[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "status" | "created" | "image">(
    "status",
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const containersLoading = false;

  useEffect(() => {
    (() => {
      const getAllContainersFromHosts = () => {
        const onlineHosts = hosts.filter((h) => h.status === "Online");
        const allContainers: NormalizedContainer[] = [];
        for (const host of onlineHosts) {
          const hostContainers = getContainers(host.tunnelUrl);
          // Add host information to each container
          hostContainers.forEach((container) => {
            allContainers.push({
              ...container,
            });
          });
        }
        return allContainers;
      };
      const data =
        !selectedHost || selectedHost.tunnelUrl === "all"
          ? getAllContainersFromHosts()
          : getContainers(selectedHost?.tunnelUrl);
      setContainers(() => data);
    })();
  }, [selectedHost, getContainers]);

  const filteredContainers = useMemo(() => {
    const filtered = containers.filter((container) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        container.names?.some((name: string) =>
          name.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        container.image.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.id.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter (multi-select)
      const matchesStatus =
        statusFilters.size === 0 ||
        statusFilters.has(container.state as ContainerState | "dead");

      // Image filter
      const matchesImage =
        !imageFilter ||
        container.image.toLowerCase().includes(imageFilter.toLowerCase());

      // Port filter
      const matchesPort =
        !portFilter ||
        container.ports?.some((port) =>
          port.toLowerCase().includes(portFilter.toLowerCase()),
        );

      // Label filter
      const matchesLabel =
        !labelFilter ||
        (container.labels &&
          Object.entries(container.labels).some(
            ([key, value]) =>
              `${key}=${value}`
                .toLowerCase()
                .includes(labelFilter.toLowerCase()) ||
              key.toLowerCase().includes(labelFilter.toLowerCase()),
          ));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesImage &&
        matchesPort &&
        matchesLabel
      );
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return formatContainerName(a.names).localeCompare(
            formatContainerName(b.names),
          );
        case "status":
          // Running first, then alphabetically
          if (a.state === "running" && b.state !== "running") return -1;
          if (a.state !== "running" && b.state === "running") return 1;
          return a.state.localeCompare(b.state);
        case "created":
          return b.created - a.created; // Newest first
        case "image":
          return a.image.localeCompare(b.image);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    containers,
    searchQuery,
    statusFilters,
    imageFilter,
    portFilter,
    labelFilter,
    sortBy,
  ]);
  const actionMutation = trpc.docker.performContainerAction.useMutation();

  const performAction = async (
    action: "start" | "stop" | "restart",
    containerId: string,
    containerName: string,
    hostUrl?: string,
  ) => {
    const targetHostUrl =
      hostUrl ||
      (selectedHost?.tunnelUrl !== "all" ? selectedHost?.tunnelUrl : undefined);
    if (!targetHostUrl) return;

    try {
      await actionMutation.mutateAsync({
        hostUrl: targetHostUrl,
        containerId,
        action,
      });

      toast.success(
        `${action.toUpperCase()} command sent to ${containerName}`,
        { duration: 5000 },
      );
      setTimeout(() => {
        if (selectedHost?.tunnelUrl === "all") {
          // Refresh all containers for all hosts mode
          hosts
            .filter((h) => h.status === "Online")
            .forEach((host) => {
              refreshContainers(host.tunnelUrl);
            });
        } else {
          refreshContainers(targetHostUrl);
        }
      }, 1000);
    } catch {
      toast.error(`Failed to ${action} container ${containerName}`, {
        duration: 7000,
      });
    }
  };

  const toggleStatusFilter = (status: ContainerState | "dead") => {
    const newFilters = new Set(statusFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setStatusFilters(newFilters);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilters(new Set());
    setImageFilter("");
    setPortFilter("");
    setLabelFilter("");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilters.size > 0) count++;
    if (imageFilter) count++;
    if (portFilter) count++;
    if (labelFilter) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Get unique images for filter suggestions
  const uniqueImages = useMemo(() => {
    const images = new Set(containers.map((c) => c.image));
    return Array.from(images).sort();
  }, [containers]);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Containers</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and control Docker containers across your infrastructure
          </p>
        </div>
        {selectedHost && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshContainers(selectedHost.tunnelUrl)}
            disabled={containersLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${containersLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Select Host
          </CardTitle>
          <CardDescription>
            Choose a host to view and manage its containers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse bg-gray-200 rounded h-4 w-32"></div>
              <div className="animate-pulse bg-gray-200 rounded h-4 w-24"></div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={selectedHost?.id || "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedHost({
                      id: "all",
                      name: "All Hosts",
                      tunnelUrl: "all",
                      status: "Online",
                      containerCount: 0,
                      runningContainers: 0,
                      metadata: {
                        ipv4: "",
                        ipv6: "",
                        vn_id: null,
                        mr: null,
                      },
                    } as Host);
                  } else {
                    const host = hosts.find((h) => h.id === value) || null;
                    setSelectedHost(host);
                  }
                  clearAllFilters();
                }}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose a host..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Server className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">All Hosts</span>
                        <span className="text-xs text-muted-foreground">
                          View containers from all hosts
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  {hosts.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              host.status === "Online"
                                ? "bg-green-500 animate-pulse"
                                : "bg-red-500"
                            }`}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{host.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {host.tunnelUrl}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List View</TooltipContent>
                </Tooltip>
              </div>

              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as "name" | "status" | "created" | "image")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="status">Sort: Status</SelectItem>
                  <SelectItem value="created">Sort: Created</SelectItem>
                  <SelectItem value="image">Sort: Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <>
        {/* Filters */}
        <Card>
          <CardContent>
            <div className="space-y-4">
              {/* Primary Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name, image, or ID... (Ctrl+F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-1 h-5 px-1.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                )}

                <Badge variant="outline" className="ml-auto">
                  {filteredContainers.length} / {containers.length} container(s)
                </Badge>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Status Multi-Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          "running",
                          "stopped",
                          "paused",
                          "exited",
                          "dead",
                        ] as const
                      ).map((status) => (
                        <div
                          key={status}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`status-${status}`}
                            checked={statusFilters.has(status)}
                            onCheckedChange={() => toggleStatusFilter(status)}
                          />
                          <label
                            htmlFor={`status-${status}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                          >
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Image</label>
                      <Input
                        placeholder="Filter by image..."
                        value={imageFilter}
                        onChange={(e) => setImageFilter(e.target.value)}
                        list="image-suggestions"
                      />
                      <datalist id="image-suggestions">
                        {uniqueImages.map((image) => (
                          <option key={image} value={image} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Port</label>
                      <Input
                        placeholder="Filter by port..."
                        value={portFilter}
                        onChange={(e) => setPortFilter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Label</label>
                      <Input
                        placeholder="Filter by label..."
                        value={labelFilter}
                        onChange={(e) => setLabelFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {searchQuery && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Search: {searchQuery}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSearchQuery("")}
                      />
                    </Badge>
                  )}
                  {Array.from(statusFilters).map((status) => (
                    <Badge
                      key={status}
                      variant="secondary"
                      className="flex items-center gap-1 capitalize"
                    >
                      Status: {status}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => toggleStatusFilter(status)}
                      />
                    </Badge>
                  ))}
                  {imageFilter && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Image: {imageFilter}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setImageFilter("")}
                      />
                    </Badge>
                  )}
                  {portFilter && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Port: {portFilter}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setPortFilter("")}
                      />
                    </Badge>
                  )}
                  {labelFilter && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Label: {labelFilter}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setLabelFilter("")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Container Grid */}
        {containersLoading ? (
          <div className="space-y-4 text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p>Loading containers...</p>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="text-center flex flex-col gap-3 py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <Server className="w-12 h-12 mx-auto opacity-50" />
            <p>No containers found.</p>
            <Link href="deploy">
              <Button>
                <Rocket />
                Deploy
              </Button>
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContainers.map((container) => (
              <Card
                key={container.id}
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden"
                onClick={() => {
                  const targetHostUrl =
                    selectedHost?.tunnelUrl === "all"
                      ? container.host
                      : selectedHost?.tunnelUrl;
                  router.push(
                    `/containers/${container.id}?host=${targetHostUrl}`,
                  );
                }}
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    container.state === "running"
                      ? "bg-green-500"
                      : container.state === "paused"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                  }`}
                />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {formatContainerName(container.names)}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono mt-1">
                        {container.id.substring(0, 12)}
                      </CardDescription>
                      {/* Host Badge for All Hosts mode */}
                      {selectedHost?.tunnelUrl === "all" && container.host && (
                        <Badge variant="secondary" className="text-xs mt-2">
                          <Server className="w-3 h-3 mr-1" />
                          {container.host}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(container.state)}
                      className="ml-2 capitalize flex items-center gap-1"
                    >
                      {container.state === "running" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {(container.state === "stopped" ||
                        container.state === "exited") && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {container.state === "paused" && (
                        <PauseCircle className="w-3 h-3" />
                      )}
                      {container.state}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Image */}
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-muted-foreground">
                      {container.image}
                    </span>
                  </div>

                  {/* Ports */}
                  {container.ports && (
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-muted-foreground">
                        {container.ports.join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="grid grid-cols-4 gap-1 pt-2 border-t">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            performAction(
                              "start",
                              container.id,
                              formatContainerName(container.names),
                            );
                          }}
                          disabled={
                            actionMutation.isPending ||
                            container.state === "running"
                          }
                          aria-label="Start container"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Start</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            performAction(
                              "stop",
                              container.id,
                              formatContainerName(container.names),
                            );
                          }}
                          disabled={
                            actionMutation.isPending ||
                            container.state !== "running"
                          }
                          aria-label="Stop container"
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Stop</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            performAction(
                              "restart",
                              container.id,
                              formatContainerName(container.names),
                            );
                          }}
                          disabled={actionMutation.isPending}
                          aria-label="Restart container"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Restart</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={"outline"}
                          disabled={container.state !== "running"}
                          onClick={(e) => {
                            e.stopPropagation();
                            createTerminal(container.host, container.id);
                          }}
                        >
                          <Terminal className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Terminal</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredContainers.map((container) => (
              <Card
                key={container.id}
                className="group hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => {
                  const targetHostUrl =
                    selectedHost?.tunnelUrl === "all"
                      ? container.host
                      : selectedHost?.tunnelUrl;
                  router.push(
                    `/containers/${container.id}?host=${targetHostUrl}`,
                  );
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        container.state === "running"
                          ? "bg-green-500 animate-pulse"
                          : container.state === "paused"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                      }`}
                    />

                    {/* Container Info */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate group-hover:text-primary transition-colors">
                          {formatContainerName(container.names)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {container.id.substring(0, 12)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div
                          className="text-sm text-muted-foreground truncate"
                          title={container.image}
                        >
                          {container.image}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getStatusBadgeVariant(container.state)}
                          className="capitalize flex items-center gap-1"
                        >
                          {container.state === "running" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {(container.state === "stopped" ||
                            container.state === "exited") && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {container.state === "paused" && (
                            <PauseCircle className="w-3 h-3" />
                          )}
                          {container.state}
                        </Badge>
                        {selectedHost?.tunnelUrl === "all" &&
                          container.host && (
                            <Badge variant="secondary" className="text-xs">
                              <Server className="w-3 h-3 mr-1" />
                              {container.host}
                            </Badge>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                performAction(
                                  "start",
                                  container.id,
                                  formatContainerName(container.names),
                                  container.host,
                                );
                              }}
                              disabled={
                                actionMutation.isPending ||
                                container.state === "running"
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Start</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                performAction(
                                  "stop",
                                  container.id,
                                  formatContainerName(container.names),
                                  container.host,
                                );
                              }}
                              disabled={
                                actionMutation.isPending ||
                                container.state !== "running"
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Square className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Stop</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                performAction(
                                  "restart",
                                  container.id,
                                  formatContainerName(container.names),
                                  container.host,
                                );
                              }}
                              disabled={actionMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restart</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    </div>
  );
}

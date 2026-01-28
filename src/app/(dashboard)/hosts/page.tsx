"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Server,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Container,
} from "lucide-react";
import { useDocker } from "@/providers/docker.provider";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function HostsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Use Docker provider for all host management
  const {
    hosts,
    refreshHosts,
    syncHosts,
    checkHostStatus,
    checkBulkHostStatus,
  } = useDocker();

  // Auto-refresh every 60 seconds (#13)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isAutoRefreshing) {
      interval = setInterval(() => {
        refreshHosts();
      }, 60000); // 60 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefreshing, refreshHosts]);

  // Filter hosts based on search query (#11)
  const filteredHosts = hosts.filter(
    (host) =>
      host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.tunnelUrl.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function handleSync() {
    try {
      const result = await syncHosts();
      toast.success(
        `Synced ${result.count} hosts. ${result.onlineCount} online.`,
        {
          duration: 5000,
        },
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync hosts from Cloudflare", {
        duration: 7000,
      });
    }
  }

  async function handleCheckStatus(deviceId: string) {
    try {
      const result = await checkHostStatus(deviceId);
      toast.success(`Host is ${result.online ? "online" : "offline"}`, {
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to check host status", {
        duration: 7000,
      });
    }
  }

  // Bulk actions (#14)
  async function handleBulkStatusCheck() {
    if (selectedHosts.length === 0) {
      toast.error("Please select at least one host", {
        duration: 5000,
      });
      return;
    }

    try {
      const results = await checkBulkHostStatus(selectedHosts);
      const onlineCount = results.filter((r) => r.online).length;
      toast.success(`Checked ${results.length} hosts. ${onlineCount} online.`, {
        duration: 5000,
      });
      setSelectedHosts([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to check host statuses", {
        duration: 7000,
      });
    }
  }

  function toggleHostSelection(deviceId: string) {
    setSelectedHosts((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId],
    );
  }

  function toggleSelectAll() {
    if (selectedHosts.length === filteredHosts.length) {
      setSelectedHosts([]);
    } else {
      setSelectedHosts(filteredHosts.map((h) => h.id));
    }
  }

  function formatLastSeen(lastSeen: Date | string | null) {
    if (!lastSeen) return "Never";

    const now = new Date();
    const lastSeenDate =
      typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Host Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Cloudflare-connected infrastructure
          </p>
        </div>

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isAutoRefreshing ? "default" : "outline"}
                  size="icon"
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  aria-label={
                    isAutoRefreshing
                      ? "Disable auto-refresh"
                      : "Enable auto-refresh"
                  }
                >
                  <Clock
                    className={`h-4 w-4 ${isAutoRefreshing ? "animate-pulse" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isAutoRefreshing
                    ? "Auto-refresh enabled (60s)"
                    : "Enable auto-refresh"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={() => refreshHosts()}
            variant="outline"
            size="icon"
            aria-label="Refresh hosts"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discovered Hosts</CardTitle>
              <CardDescription>
                Hosts synchronized from Cloudflare ({filteredHosts.length} of{" "}
                {hosts.length})
              </CardDescription>
            </div>
            <Button onClick={handleSync} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync from Cloudflare
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Bulk Actions (#11, #14) */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search hosts by name or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedHosts.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedHosts.length} selected
                </Badge>
                <Button
                  onClick={handleBulkStatusCheck}
                  size="sm"
                  variant="outline"
                >
                  Check Selected
                </Button>
              </div>
            )}
          </div>

          {!hosts.length ? (
            <div className="border border-border rounded-md">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Server className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No hosts found</p>
              <p className="text-sm mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Click sync to discover from Cloudflare"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedHosts.length === filteredHosts.length &&
                          filteredHosts.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all hosts"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Tunnel URL</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Containers</TableHead>
                    <TableHead className="font-semibold">Last Seen</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHosts.map((host) => (
                    <TableRow key={host.id} className="hover:bg-accent/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedHosts.includes(host.id)}
                          onCheckedChange={() => toggleHostSelection(host.id)}
                          aria-label={`Select ${host.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/hosts/${host.id}`}
                          className="hover:underline"
                        >
                          {host.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {host.tunnelUrl}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              host.status === "Online"
                                ? "bg-green-500 animate-pulse"
                                : "bg-red-500"
                            }`}
                          />
                          <Badge
                            variant={
                              host.status === "Online" ? "success" : "secondary"
                            }
                            className="font-normal gap-1"
                          >
                            {host.status === "Online" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {host.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Enhanced Host Information (#12) */}
                        <div className="flex items-center gap-1 text-sm">
                          <Container className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {host.runningContainers || 0}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">
                            {host.containerCount || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastSeen(host.lastSeen)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleCheckStatus(host.id)}
                            size="sm"
                            variant="outline"
                          >
                            Check Status
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/hosts/${host.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

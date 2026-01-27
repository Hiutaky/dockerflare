"use client";

import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Server,
  Container,
  Clock,
  Network,
  Database,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useDocker } from "@/providers/docker.provider";

interface HostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function HostDetailPage({ params }: HostDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use Docker provider for all data
  const { hosts, refreshHosts, checkHostStatus, getContainers } = useDocker();
  const host = hosts?.find((h) => h.id === id);
  const containers =
    host?.status === "Online" ? getContainers(host.tunnelUrl) : [];

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (host?.status === "Online") {
        refreshHosts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [host?.status, refreshHosts]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshHosts();
      toast.success("Refreshed host data", { duration: 3000 });
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh", { duration: 5000 });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCheckStatus() {
    if (!host) return;

    try {
      const result = await checkHostStatus(host.id);
      toast.success(`Host is ${result.online ? "online" : "offline"}`, {
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to check host status", {
        duration: 5000,
      });
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

  function getContainerStatusCounts() {
    const running = containers.filter((c) => c.state === "running").length;
    const stopped = containers.filter(
      (c) => c.state === "exited" || c.state === "stopped",
    ).length;
    const paused = containers.filter((c) => c.state === "paused").length;
    return { running, stopped, paused };
  }

  if (!host) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/hosts")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Host Not Found
            </h1>
            <p className="text-muted-foreground mt-2">
              The requested host could not be found
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getContainerStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hosts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{host.name}</h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm">
              {host.tunnelUrl}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCheckStatus} variant="outline" size="sm">
            Check Status
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="icon"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  host.status === "Online"
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              <Badge
                variant={host.status === "Online" ? "success" : "secondary"}
                className="gap-1"
              >
                {host.status === "Online" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {host.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last seen: {formatLastSeen(host.lastSeen)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Containers
            </CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{host.containerCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {host.runningContainers || 0} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.running}</div>
            <p className="text-xs text-muted-foreground">Active containers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.stopped}</div>
            <p className="text-xs text-muted-foreground">Inactive containers</p>
          </CardContent>
        </Card>
      </div>

      {/* Host Information */}
      <Card>
        <CardHeader>
          <CardTitle>Host Information</CardTitle>
          <CardDescription>
            Detailed information about this host
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Name:</span>
                <span className="text-muted-foreground">{host.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Tunnel URL:</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {host.tunnelUrl}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Last Seen:</span>
                <span className="text-muted-foreground">
                  {formatLastSeen(host.lastSeen)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Device ID:</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {host.id}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Containers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Containers</CardTitle>
              <CardDescription>
                All containers running on this host ({containers.length} total)
              </CardDescription>
            </div>
            {host.status === "Online" && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/containers?host=${encodeURIComponent(host.tunnelUrl)}`}
                >
                  View All
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {host.status !== "Online" ? (
            <div className="text-center py-12 text-muted-foreground">
              <Server className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">Host is offline</p>
              <p className="text-sm mt-1">
                Containers cannot be displayed while host is offline
              </p>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex flex-col gap-3 text-center py-12 text-muted-foreground">
              <Container className="mx-auto h-12 w-12 opacity-20" />
              <p className="font-medium">No containers</p>
              <p className="text-sm">Deploy a container to get started</p>
              <Link href={"/deploy"}>
                <Button>
                  <Rocket />
                  Deploy
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Image</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Ports</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((container) => (
                    <TableRow key={container.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">
                        {container.names[0]?.replace(/^\//, "") ||
                          container.id.substring(0, 12)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {container.image}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            container.state === "running"
                              ? "success"
                              : container.state === "paused"
                                ? "secondary"
                                : "secondary"
                          }
                          className="gap-1"
                        >
                          {container.state === "running" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {container.state === "exited" && (
                            <XCircle className="h-3 w-3" />
                          )}
                          {container.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {container.ports && container.ports.length > 0
                          ? container.ports.join(", ")
                          : "None"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/containers/${container.id}`}>
                            View Details
                          </Link>
                        </Button>
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

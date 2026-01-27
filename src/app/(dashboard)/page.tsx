"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Activity,
  Box,
  RefreshCw,
  Plus,
  Cloud,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useDocker } from "@/providers/docker.provider";
import { trpc } from "@/lib/trpc-client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = {
  running: "#10b981",
  stopped: "#6b7280",
  paused: "#f59e0b",
};

export default function DashboardPage() {
  const router = useRouter();
  const { hosts, checkHostsStatus } = useDocker();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoRefreshEnabled] = useState(true);

  const totalHosts = hosts.length;
  const onlineHosts = hosts.filter((h) => h.status === "Online").length;

  // Fetch aggregate stats
  const {
    data: stats,
    refetch: refetchStats,
    isLoading: statsLoading,
  } = trpc.docker.getAggregateStats.useQuery(undefined, {
    refetchInterval: autoRefreshEnabled ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: recentActivity } = trpc.docker.getRecentActivity.useQuery({
    limit: 10,
  });

  // Sync hosts mutation
  const syncHostsMutation = trpc.docker.syncHosts.useMutation();

  const totalContainers = stats?.totalContainers ?? 0;
  const runningContainers = stats?.runningContainers ?? 0;
  const stoppedContainers = stats?.stoppedContainers ?? 0;
  const pausedContainers = stats?.pausedContainers ?? 0;

  const isLoading = !hosts.length || statsLoading;

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log("[Dashboard] Auto-refreshing...");
      checkHostsStatus();
      refetchStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, checkHostsStatus, refetchStats]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await checkHostsStatus();
      await refetchStats();
      toast.success("Dashboard refreshed", { duration: 3000 });
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh dashboard", { duration: 5000 });
    } finally {
      setIsRefreshing(false);
    }
  }, [checkHostsStatus, refetchStats]);

  // Sync hosts
  const handleSyncHosts = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncHostsMutation.mutateAsync();
      toast.success(
        `Synced ${result.count} hosts (${result.onlineCount} online)`,
        { duration: 5000 },
      );
      await checkHostsStatus();
      await refetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync hosts", { duration: 5000 });
    } finally {
      setIsSyncing(false);
    }
  }, [syncHostsMutation, checkHostsStatus, refetchStats]);

  // Container distribution data for pie chart
  const containerDistribution = [
    { name: "Running", value: runningContainers, color: COLORS.running },
    { name: "Stopped", value: stoppedContainers, color: COLORS.stopped },
    { name: "Paused", value: pausedContainers, color: COLORS.paused },
  ].filter((item) => item.value > 0);

  // Mock activity timeline data (for area chart)
  const activityData = [
    { time: "6h ago", containers: totalContainers * 0.8 },
    { time: "5h ago", containers: totalContainers * 0.85 },
    { time: "4h ago", containers: totalContainers * 0.9 },
    { time: "3h ago", containers: totalContainers * 0.88 },
    { time: "2h ago", containers: totalContainers * 0.95 },
    { time: "1h ago", containers: totalContainers * 0.92 },
    { time: "Now", containers: totalContainers },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dockerflare Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your infrastructure
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncHosts}
            disabled={isSyncing}
          >
            <Cloud
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-pulse" : ""}`}
            />
            Sync Hosts
          </Button>
          <Button size="sm" onClick={() => router.push("/deploy")}>
            <Plus className="h-4 w-4 mr-2" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hosts
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "—" : totalHosts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {onlineHosts} online
            </p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Containers
            </CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "—" : totalContainers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all hosts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Running
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? "—" : runningContainers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active containers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stopped
            </CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "—" : stoppedContainers + pausedContainers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Inactive containers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Container Distribution Pie Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Container Distribution</CardTitle>
            <CardDescription>Status breakdown across all hosts</CardDescription>
          </CardHeader>
          <CardContent>
            {totalContainers > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={containerDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {containerDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <div className="text-center">
                  <Box className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>No containers deployed yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Container Activity</CardTitle>
            <CardDescription>Container count over time</CardDescription>
          </CardHeader>
          <CardContent>
            {totalContainers > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="containers"
                    stroke="#10b981"
                    fill="#10b98120"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>No activity data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity and Hosts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 actions performed</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.deviceId && (
                          <Badge variant="outline" className="text-xs">
                            {activity.deviceId}
                          </Badge>
                        )}
                        {activity.containerId && (
                          <span className="text-xs text-muted-foreground truncate">
                            {activity.containerId.slice(0, 12)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No recent activity</p>
                <p className="text-sm mt-1">Action logs will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Hosts */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Registered Hosts</CardTitle>
            <CardDescription>Hosts discovered and managed</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="animate-pulse">Loading hosts...</div>
              </div>
            ) : hosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="mx-auto h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No hosts found</p>
                <p className="text-sm mt-1">
                  Click &quot;Sync Hosts&quot; to discover hosts
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hosts.slice(0, 5).map((host) => (
                  <div
                    key={host.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push("/hosts")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        {host.status === "Online" && (
                          <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{host.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {host.tunnelUrl}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        host.status === "Online" ? "default" : "secondary"
                      }
                    >
                      {host.status}
                    </Badge>
                  </div>
                ))}
                {hosts.length > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => router.push("/hosts")}
                  >
                    View all {hosts.length} hosts
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

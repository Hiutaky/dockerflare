"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap,
  ZapOff,
  Cpu,
  MemoryStick,
  Network,
  HardDrive,
} from "lucide-react";
import {
  useDocker,
  type ContainerStats as StatsType,
} from "@/providers/docker.provider";

interface ContainerStatsProps {
  hostUrl: string;
  containerId: string;
  containerName: string;
  className?: string;
  isActive?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function ContainerStats({
  hostUrl,
  containerId,
  className = "",
  isActive = true,
}: ContainerStatsProps) {
  const { subscribeStats, getConnectionState } = useDocker();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [memoryPercent, setMemoryPercent] = useState(0);

  useEffect(() => {
    console.log("init");
  }, []);
  const isConnected = getConnectionState(containerId);

  // Subscribe to stats using DockerProvider - only when active
  useEffect(() => {
    if (!containerId || !isActive) return;

    console.log(`[ContainerStats] Subscribing to stats for ${containerId}`);

    const unsubscribe = subscribeStats(
      containerId,
      (newStats) => {
        setStats(newStats);
        if (newStats) {
          setMemoryPercent(
            Math.round((newStats.memory_usage / newStats.memory_limit) * 100),
          );
        }
      },
      hostUrl,
    );

    return () => {
      console.log(
        `[ContainerStats] Unsubscribing from stats for ${containerId}`,
      );
      unsubscribe();
    };
  }, [containerId, hostUrl, isActive, subscribeStats]);

  const getConnectionBadge = () => {
    if (isConnected) {
      return (
        <Badge variant="default" className="gap-1">
          <Zap className="w-3 h-3" /> Connected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <ZapOff className="w-3 h-3" /> Disconnected
      </Badge>
    );
  };

  const getCpuColor = (percent: number) => {
    if (percent < 50) return "text-green-500";
    if (percent < 80) return "text-yellow-500";
    return "text-red-500";
  };

  const getMemoryColor = (percent: number) => {
    if (percent < 50) return "text-blue-500";
    if (percent < 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-time Statistics</h3>
        {getConnectionBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2">
                <div
                  className={`text-3xl font-bold ${getCpuColor(stats.cpu_percent)}`}
                >
                  {stats.cpu_percent.toFixed(2)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.cpu_percent < 50
                        ? "bg-green-500"
                        : stats.cpu_percent < 80
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(stats.cpu_percent, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MemoryStick className="w-4 h-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2">
                <div
                  className={`text-3xl font-bold ${getMemoryColor(memoryPercent)}`}
                >
                  {memoryPercent.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatBytes(stats.memory_usage)} /{" "}
                  {formatBytes(stats.memory_limit)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      memoryPercent < 50
                        ? "bg-blue-500"
                        : memoryPercent < 80
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(memoryPercent, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="w-4 h-4" />
              Network I/O
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    RX (Received)
                  </span>
                  <span className="text-sm font-semibold">
                    {formatBytes(stats.network_rx)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    TX (Transmitted)
                  </span>
                  <span className="text-sm font-semibold">
                    {formatBytes(stats.network_tx)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disk Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Disk I/O
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Read</span>
                  <span className="text-sm font-semibold">
                    {formatBytes(stats.block_read)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Write</span>
                  <span className="text-sm font-semibold">
                    {formatBytes(stats.block_write)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

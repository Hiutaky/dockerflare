"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, ZapOff, Download, Trash2, Pause, Play } from "lucide-react";
import { useDocker } from "@/providers/docker.provider";

interface ContainerLogsProps {
  hostUrl: string;
  containerId: string;
  containerName: string;
  tail?: number;
  follow?: boolean;
  className?: string;
  isActive?: boolean;
}

export function ContainerLogs({
  hostUrl,
  containerId,
  containerName,
  className = "",
  isActive = true,
}: ContainerLogsProps) {
  const { subscribeLogs, getConnectionState } = useDocker();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const isConnected = getConnectionState(containerId);

  // Subscribe to logs using DockerProvider - only when active
  useEffect(() => {
    if (!containerId || !isActive) return;

    console.log(`[ContainerLogs] Subscribing to logs for ${containerId}`);

    const unsubscribe = subscribeLogs(
      containerId,
      (newLogs) => {
        setLogs(newLogs);
      },
      hostUrl,
    );

    return () => {
      console.log(`[ContainerLogs] Unsubscribing from logs for ${containerId}`);
      unsubscribe();
    };
  }, [containerId, hostUrl, isActive, subscribeLogs]);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isPaused) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isPaused]);

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

  const handleClear = () => {
    setLogs("");
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${containerName}-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getConnectionBadge()}
          {isPaused && (
            <Badge variant="outline" className="gap-1">
              <Pause className="w-3 h-3" /> Paused
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={togglePause}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-3 h-3" />
            ) : (
              <Pause className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!logs}
            title="Download logs"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px] w-full rounded-md border bg-black">
        <div className="p-4">
          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
            {logs || "Waiting for logs..."}
          </pre>
          <div ref={logsEndRef} />
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Lines: {logs.split("\n").length - 1}</span>
        <span>•</span>
        <span>Size: {(new Blob([logs]).size / 1024).toFixed(2)} KB</span>
        <span>•</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3"
          />
          Auto-scroll
        </label>
      </div>
    </div>
  );
}

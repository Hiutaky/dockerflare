"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContainerLogs } from "@/components/ContainerLogs";
import { ContainerStats } from "@/components/ContainerStats";
import { ContainerModifyDialog } from "@/components/ContainerModifyDialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Loader2,
  Server,
  ExternalLink,
  Clock,
  Tag,
  MoreVertical,
  Pause,
  PlayCircle,
  Trash2,
  Settings,
} from "lucide-react";
import { useDocker } from "@/providers/docker.provider";

export default function ContainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;
  const { getContainer, isLoading, refreshContainers } = useDocker();

  const [activeTab, setActiveTab] = useState("overview");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  const container = getContainer(containerId);

  const hostUrl = useMemo(() => {
    return container?.host;
  }, [container]);
  const actionMutation = trpc.docker.performContainerAction.useMutation();

  const performAction = async (
    action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove",
  ) => {
    if (!container || !hostUrl) return;

    try {
      await actionMutation.mutateAsync({
        hostUrl,
        containerId: container.id,
        action,
      });

      toast.success(`${action.toUpperCase()} command sent successfully`);

      // If removing, redirect to containers list
      if (action === "remove") {
        setTimeout(() => router.push("/containers"), 1000);
      }
      setTimeout(() => refreshContainers(hostUrl), 1000);
    } catch {
      toast.error(`Failed to ${action} container`);
    }
  };

  const handleRemoveContainer = async () => {
    await performAction("remove");
    setShowRemoveDialog(false);
  };

  const formatContainerName = (names?: string[]) => {
    if (!names || names.length === 0) return "Unnamed";
    return names[0].replace(/\//g, "");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/containers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Containers
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Container not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/containers")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {formatContainerName(container.names)}
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {container.id}
            </p>
          </div>
        </div>
        <Badge
          variant={getStatusBadgeVariant(container.state)}
          className="capitalize"
        >
          {container.state}
        </Badge>
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <CardDescription>
            Manage container lifecycle and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => performAction("start")}
              disabled={
                actionMutation.isPending || container.state === "running"
              }
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => performAction("stop")}
              disabled={
                actionMutation.isPending ||
                (container.state !== "restarting" &&
                  container.state !== "running")
              }
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => performAction("restart")}
              disabled={actionMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowModifyDialog(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Modify
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => performAction("pause")}
                  disabled={container.state !== "running"}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Container
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => performAction("unpause")}
                  disabled={container.state !== "paused"}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Unpause Container
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setShowRemoveDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Container
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the container{" "}
              <strong>{formatContainerName(container.names)}</strong>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveContainer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Container
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Container Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Container Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Server className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Image</p>
                    <p className="text-sm font-medium truncate">
                      {container.image}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Image ID</p>
                    <p className="text-sm font-mono truncate">
                      {container.imageID?.substring(7, 19) || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(container.created)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Network & Ports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {container.ports && container.ports.length > 0 ? (
                  container.ports.map((port, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{port}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No ports exposed
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            {container.labels && Object.keys(container.labels).length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Labels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(container.labels)
                      .slice(0, 10)
                      .map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-mono text-muted-foreground">
                            {key}:
                          </span>{" "}
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        {hostUrl && (
          <>
            {/* Logs Tab */}
            <TabsContent value="logs" className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <div className={activeTab === "logs" ? "" : "hidden"}>
                    <ContainerLogs
                      hostUrl={hostUrl}
                      containerId={container.id}
                      containerName={formatContainerName(container.names)}
                      isActive={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-0">
              <div className={activeTab === "stats" ? "" : "hidden"}>
                <ContainerStats
                  hostUrl={hostUrl}
                  containerId={container.id}
                  containerName={formatContainerName(container.names)}
                />
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modify Container Dialog */}
      {hostUrl && (
        <ContainerModifyDialog
          open={showModifyDialog}
          onOpenChange={setShowModifyDialog}
          containerId={containerId}
          hostUrl={hostUrl}
          containerName={formatContainerName(container.names)}
        />
      )}
    </div>
  );
}

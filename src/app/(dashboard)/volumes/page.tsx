"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type SortColumn = "name" | "driver" | "createdAt" | "host";
type SortDirection = "asc" | "desc";

export default function VolumesPage() {
  const [createVolumeName, setCreateVolumeName] = useState("");
  const [selectedHost, setSelectedHost] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(
    new Set(),
  );

  // Get all hosts
  const { data: hosts, isLoading: hostsLoading } =
    trpc.docker.getHosts.useQuery();
  const onlineHosts = hosts?.filter((h) => h.status === "Online") || [];

  // Get volumes for selected host or all volumes
  const {
    data: volumes,
    isLoading: volumesLoading,
    refetch,
  } = trpc.docker.getAllVolumes.useQuery();

  // Sort volumes
  const sortedVolumes = volumes
    ? [...volumes].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case "name":
            aValue = a.name;
            bValue = b.name;
            break;
          case "driver":
            aValue = a.driver;
            bValue = b.driver;
            break;
          case "createdAt":
            aValue = a.createdAt || "";
            bValue = b.createdAt || "";
            break;
          case "host":
            aValue = a.host;
            bValue = b.host;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : [];

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const createVolumeMutation = trpc.docker.createVolume.useMutation();
  const removeVolumeMutation = trpc.docker.removeVolume.useMutation();

  const handleCreateVolume = async () => {
    if (!selectedHost || !createVolumeName.trim()) {
      toast.error("Please select a host and enter a volume name");
      return;
    }

    try {
      await createVolumeMutation.mutateAsync({
        hostUrl: selectedHost,
        name: createVolumeName.trim(),
        driver: "local",
      });
      toast.success(`Volume ${createVolumeName} created successfully`);
      setCreateVolumeName("");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to create volume: ${(error as Error).message}`);
    }
  };

  const handleRemoveVolume = async (hostUrl: string, volumeName: string) => {
    try {
      await removeVolumeMutation.mutateAsync({
        hostUrl,
        volumeName,
      });
      toast.success("Volume removed successfully");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove volume: ${(error as Error).message}`);
    }
  };

  // Bulk selection handlers
  const handleSelectVolume = (volumeId: string, checked: boolean) => {
    const newSelected = new Set(selectedVolumes);
    if (checked) {
      newSelected.add(volumeId);
    } else {
      newSelected.delete(volumeId);
    }
    setSelectedVolumes(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && sortedVolumes) {
      setSelectedVolumes(
        new Set(sortedVolumes.map((vol) => `${vol.host}-${vol.name}`)),
      );
    } else {
      setSelectedVolumes(new Set());
    }
  };

  const handleBulkRemove = async () => {
    if (selectedVolumes.size === 0) {
      toast.error("No volumes selected");
      return;
    }

    try {
      // Group selected volumes by host
      const volumesByHost: { [hostUrl: string]: string[] } = {};

      selectedVolumes.forEach((selectedId) => {
        const [hostUrl, ...volumeNameParts] = selectedId.split("-");
        const volumeName = volumeNameParts.join("-");
        if (!volumesByHost[hostUrl]) volumesByHost[hostUrl] = [];
        volumesByHost[hostUrl].push(volumeName);
      });

      // Remove volumes from each host
      const removePromises = Object.entries(volumesByHost).map(
        async ([hostUrl, volumeNames]) => {
          return Promise.all(
            volumeNames.map((volumeName) =>
              removeVolumeMutation.mutateAsync({ hostUrl, volumeName }),
            ),
          );
        },
      );

      await Promise.all(removePromises);

      toast.success(`Removed ${selectedVolumes.size} volumes`);
      setSelectedVolumes(new Set());
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove volumes: ${(error as Error).message}`);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  if (hostsLoading) {
    return <div className="p-6">Loading hosts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Docker Volumes</h1>
        <div className="flex items-center space-x-2">
          <select
            className="px-3 py-2 border border-border rounded-md bg-background"
            value={selectedHost}
            onChange={(e) => setSelectedHost(e.target.value)}
          >
            <option value="">Select host...</option>
            {onlineHosts.map((host) => (
              <option key={host.id} value={host.tunnelUrl}>
                {host.name} ({host.tunnelUrl})
              </option>
            ))}
          </select>
          <Input
            placeholder="Volume name"
            value={createVolumeName}
            onChange={(e) => setCreateVolumeName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreateVolume()}
          />
          <Button
            onClick={handleCreateVolume}
            disabled={createVolumeMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Volume
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedVolumes.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedVolumes.size} volume
              {selectedVolumes.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVolumes(new Set())}
            >
              Clear Selection
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={removeVolumeMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected ({selectedVolumes.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Volumes</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {selectedVolumes.size}{" "}
                    volume
                    {selectedVolumes.size === 1 ? "" : "s"}? This action cannot
                    be undone and may affect containers using these volumes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkRemove}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {volumesLoading ? (
        <div className="border border-border rounded-md">
          <TableSkeleton rows={6} columns={8} />
        </div>
      ) : !volumes || volumes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No volumes found. Create a volume to get started.
        </div>
      ) : (
        <div className="border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      sortedVolumes &&
                      selectedVolumes.size === sortedVolumes.length &&
                      sortedVolumes.length > 0
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked as boolean)
                    }
                    aria-label="Select all volumes"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortColumn === "name" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("driver")}
                >
                  <div className="flex items-center gap-1">
                    Driver
                    {sortColumn === "driver" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead>Mount Point</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortColumn === "createdAt" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("host")}
                >
                  <div className="flex items-center gap-1">
                    Host
                    {sortColumn === "host" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVolumes.map((volume) => (
                <TableRow key={`${volume.host}-${volume.name}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVolumes.has(
                        `${volume.host}-${volume.name}`,
                      )}
                      onCheckedChange={(checked) =>
                        handleSelectVolume(
                          `${volume.host}-${volume.name}`,
                          checked as boolean,
                        )
                      }
                      aria-label={`Select volume ${volume.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{volume.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{volume.driver}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {volume.mountpoint}
                  </TableCell>
                  <TableCell>
                    {volume.labels && Object.keys(volume.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(volume.labels).map(([key, value]) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className="text-xs"
                          >
                            {key}={value}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(volume.createdAt)}</TableCell>
                  <TableCell>{volume.host}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Volume
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Volume</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove the volume
                                &quot;
                                {volume.name}&quot; from host {volume.host}?
                                This action cannot be undone and may affect
                                containers using this volume.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveVolume(volume.host, volume.name)
                                }
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

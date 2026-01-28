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

type SortColumn = "name" | "driver" | "scope" | "createdAt" | "host";
type SortDirection = "asc" | "desc";

export default function NetworksPage() {
  const [createNetworkName, setCreateNetworkName] = useState("");
  const [selectedHost, setSelectedHost] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(
    new Set(),
  );

  // Get all hosts
  const { data: hosts, isLoading: hostsLoading } =
    trpc.docker.getHosts.useQuery();
  const onlineHosts = hosts?.filter((h) => h.status === "Online") || [];

  // Get networks for selected host or all networks
  const {
    data: networks,
    isLoading: networksLoading,
    refetch,
  } = trpc.docker.getAllNetworks.useQuery();

  // Sort networks
  const sortedNetworks = networks
    ? [...networks].sort((a, b) => {
        let aValue: string | boolean | number;
        let bValue: string | boolean | number;

        switch (sortColumn) {
          case "name":
            aValue = a.name;
            bValue = b.name;
            break;
          case "driver":
            aValue = a.driver;
            bValue = b.driver;
            break;
          case "scope":
            aValue = a.scope;
            bValue = b.scope;
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

  const createNetworkMutation = trpc.docker.createNetwork.useMutation();
  const removeNetworkMutation = trpc.docker.removeNetwork.useMutation();

  const handleCreateNetwork = async () => {
    if (!selectedHost || !createNetworkName.trim()) {
      toast.error("Please select a host and enter a network name");
      return;
    }

    try {
      await createNetworkMutation.mutateAsync({
        hostUrl: selectedHost,
        name: createNetworkName.trim(),
        driver: "bridge",
        internal: false,
        attachable: true,
        labels: {},
        options: {},
      });
      toast.success(`Network ${createNetworkName} created successfully`);
      setCreateNetworkName("");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to create network: ${(error as Error).message}`);
    }
  };

  const handleRemoveNetwork = async (hostUrl: string, networkId: string) => {
    try {
      await removeNetworkMutation.mutateAsync({
        hostUrl,
        networkId,
      });
      toast.success("Network removed successfully");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove network: ${(error as Error).message}`);
    }
  };

  // Bulk selection handlers
  const handleSelectNetwork = (networkId: string, checked: boolean) => {
    const newSelected = new Set(selectedNetworks);
    if (checked) {
      newSelected.add(networkId);
    } else {
      newSelected.delete(networkId);
    }
    setSelectedNetworks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && sortedNetworks) {
      setSelectedNetworks(
        new Set(sortedNetworks.map((net) => `${net.host}-${net.id}`)),
      );
    } else {
      setSelectedNetworks(new Set());
    }
  };

  const handleBulkRemove = async () => {
    if (selectedNetworks.size === 0) {
      toast.error("No networks selected");
      return;
    }

    try {
      // Group selected networks by host
      const networksByHost: { [hostUrl: string]: string[] } = {};

      selectedNetworks.forEach((selectedId) => {
        const [hostUrl, networkId] = selectedId.split("-", 2);
        if (!networksByHost[hostUrl]) networksByHost[hostUrl] = [];
        networksByHost[hostUrl].push(networkId);
      });

      // Remove networks from each host
      const removePromises = Object.entries(networksByHost).map(
        async ([hostUrl, networkIds]) => {
          return Promise.all(
            networkIds.map((networkId) =>
              removeNetworkMutation.mutateAsync({ hostUrl, networkId }),
            ),
          );
        },
      );

      await Promise.all(removePromises);

      toast.success(`Removed ${selectedNetworks.size} networks`);
      setSelectedNetworks(new Set());
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove networks: ${(error as Error).message}`);
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
        <h1 className="text-2xl font-bold">Docker Networks</h1>
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
            placeholder="Network name"
            value={createNetworkName}
            onChange={(e) => setCreateNetworkName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreateNetwork()}
          />
          <Button
            onClick={handleCreateNetwork}
            disabled={createNetworkMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Network
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedNetworks.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedNetworks.size} network
              {selectedNetworks.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNetworks(new Set())}
            >
              Clear Selection
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={removeNetworkMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected ({selectedNetworks.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Networks</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {selectedNetworks.size}{" "}
                    network
                    {selectedNetworks.size === 1 ? "" : "s"}? This action cannot
                    be undone and may affect containers using these networks.
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

      {networksLoading ? (
        <div className="border border-border rounded-md">
          <TableSkeleton rows={6} columns={9} />
        </div>
      ) : !networks || networks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No networks found. Create a network to get started.
        </div>
      ) : (
        <div className="border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      sortedNetworks &&
                      selectedNetworks.size === sortedNetworks.length &&
                      sortedNetworks.length > 0
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked as boolean)
                    }
                    aria-label="Select all networks"
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
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("scope")}
                >
                  <div className="flex items-center gap-1">
                    Scope
                    {sortColumn === "scope" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead>Internal</TableHead>
                <TableHead>Attachable</TableHead>
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
              {sortedNetworks.map((network) => (
                <TableRow key={`${network.host}-${network.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedNetworks.has(
                        `${network.host}-${network.id}`,
                      )}
                      onCheckedChange={(checked) =>
                        handleSelectNetwork(
                          `${network.host}-${network.id}`,
                          checked as boolean,
                        )
                      }
                      aria-label={`Select network ${network.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{network.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{network.driver}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{network.scope}</Badge>
                  </TableCell>
                  <TableCell>
                    {network.internal ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {network.attachable ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {network.labels &&
                    Object.keys(network.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(network.labels).map(([key, value]) => (
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
                  <TableCell>{formatDate(network.createdAt)}</TableCell>
                  <TableCell>{network.host}</TableCell>
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
                              Remove Network
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove Network
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove the network
                                &quot;
                                {network.name}&quot;? This action cannot be
                                undone and may affect containers using this
                                network.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveNetwork(network.host, network.id)
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

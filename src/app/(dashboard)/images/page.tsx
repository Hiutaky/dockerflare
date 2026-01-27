"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
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
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type SortColumn = "name" | "size" | "created" | "host";
type SortDirection = "asc" | "desc";

export default function ImagesPage() {
  const [pullImageName, setPullImageName] = useState("");
  const [selectedHost, setSelectedHost] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Get all hosts
  const { data: hosts, isLoading: hostsLoading } =
    trpc.docker.getHosts.useQuery();
  const onlineHosts = hosts?.filter((h) => h.status === "Online") || [];

  // Get images for selected host or all images
  const {
    data: images,
    isLoading: imagesLoading,
    refetch,
  } = trpc.docker.getAllImages.useQuery();

  // Sort images
  const sortedImages = images
    ? [...images].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case "name":
            aValue = a.repoTags[0] || "";
            bValue = b.repoTags[0] || "";
            break;
          case "size":
            aValue = a.size;
            bValue = b.size;
            break;
          case "created":
            aValue = a.created;
            bValue = b.created;
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

  const pullImageMutation = trpc.docker.pullImage.useMutation();
  const removeImageMutation = trpc.docker.removeImage.useMutation();

  const handlePullImage = async () => {
    if (!selectedHost || !pullImageName.trim()) {
      toast.error("Please select a host and enter an image name");
      return;
    }

    try {
      await pullImageMutation.mutateAsync({
        hostUrl: selectedHost,
        imageName: pullImageName.trim(),
      });
      toast.success(`Pulling image ${pullImageName}`);
      setPullImageName("");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to pull image: ${(error as Error).message}`);
    }
  };

  const handleRemoveImage = async (hostUrl: string, imageId: string) => {
    try {
      await removeImageMutation.mutateAsync({
        hostUrl,
        imageId,
      });
      toast.success("Image removed successfully");
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove image: ${(error as Error).message}`);
    }
  };

  // Bulk selection handlers
  const handleSelectImage = (imageId: string, checked: boolean) => {
    const newSelected = new Set(selectedImages);
    if (checked) {
      newSelected.add(imageId);
    } else {
      newSelected.delete(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && sortedImages) {
      setSelectedImages(
        new Set(sortedImages.map((img) => `${img.host}-${img.id}`)),
      );
    } else {
      setSelectedImages(new Set());
    }
  };

  const handleBulkRemove = async () => {
    if (selectedImages.size === 0) {
      toast.error("No images selected");
      return;
    }

    try {
      // Group selected images by host
      const imagesByHost: { [hostUrl: string]: string[] } = {};

      selectedImages.forEach((selectedId) => {
        const [hostUrl, ...imageIdParts] = selectedId.split("-");
        const imageId = imageIdParts.join("-");
        if (!imagesByHost[hostUrl]) imagesByHost[hostUrl] = [];
        imagesByHost[hostUrl].push(imageId);
      });

      // Remove images from each host
      const removePromises = Object.entries(imagesByHost).map(
        async ([hostUrl, imageIds]) => {
          return Promise.all(
            imageIds.map((imageId) =>
              removeImageMutation.mutateAsync({ hostUrl, imageId }),
            ),
          );
        },
      );

      await Promise.all(removePromises);

      toast.success(`Removed ${selectedImages.size} images`);
      setSelectedImages(new Set());
      refetch();
    } catch (error: unknown) {
      toast.error(`Failed to remove images: ${(error as Error).message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (hostsLoading) {
    return <div className="p-6">Loading hosts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Docker Images</h1>
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
            placeholder="e.g., nginx:alpine"
            value={pullImageName}
            onChange={(e) => setPullImageName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePullImage()}
          />
          <Button
            onClick={handlePullImage}
            disabled={pullImageMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Pull Image
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedImages.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedImages.size} image{selectedImages.size === 1 ? "" : "s"}{" "}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedImages(new Set())}
            >
              Clear Selection
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={removeImageMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected ({selectedImages.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Images</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {selectedImages.size} image
                    {selectedImages.size === 1 ? "" : "s"}? This action cannot
                    be undone.
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

      {imagesLoading ? (
        <div className="text-center py-8">Loading images...</div>
      ) : !images || images.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No images found. Pull an image to get started.
        </div>
      ) : (
        <div className="border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      sortedImages &&
                      selectedImages.size === sortedImages.length &&
                      sortedImages.length > 0
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked as boolean)
                    }
                    aria-label="Select all images"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Repository Tags
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
                  onClick={() => handleSort("size")}
                >
                  <div className="flex items-center gap-1">
                    Size
                    {sortColumn === "size" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead>Virtual Size</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("created")}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortColumn === "created" &&
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
              {sortedImages.map((image) => (
                <TableRow key={`${image.host}-${image.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedImages.has(`${image.host}-${image.id}`)}
                      onCheckedChange={(checked) =>
                        handleSelectImage(
                          `${image.host}-${image.id}`,
                          checked as boolean,
                        )
                      }
                      aria-label={`Select image ${image.repoTags[0] || "Unknown"}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {image.repoTags.map((tag: string, index: number) => (
                        <div
                          className="flex flex-col gap-2  items-start"
                          key={index}
                        >
                          <Badge variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                          {image.labels?.["org.opencontainers.image.title"] && (
                            <Badge>
                              {image.labels?.["org.opencontainers.image.title"]}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(image.size)}</TableCell>
                  <TableCell>{formatBytes(image.virtualSize)}</TableCell>
                  <TableCell>{formatDate(image.created)}</TableCell>
                  <TableCell>{image.host}</TableCell>
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
                              Remove Image
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Image</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove the image &quot;
                                {image.repoTags[0] || "Unknown"}&quot; from host{" "}
                                {image.host}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveImage(image.host, image.id)
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

import { router } from "../trpc";
import { publicProcedure } from "../trpc";
import { getWARPDevices } from "../cloudflare";
import * as DockerAPI from "../docker-client";
import { hostStore } from "../host-store";
import { NormalizedImage, NormalizedVolume, NormalizedNetwork } from "@/types";
import {
  checkBulkHostStatusSchema,
  checkHostStatusSchema,
  getContainerConfigSchema,
  getContainersSchema,
  getImagesSchema,
  getRecentActivitySchema,
  modifyContainerSchema,
  performContainerActionSchema,
  pullImageSchema,
  removeImageSchema,
  getVolumesSchema,
  createVolumeSchema,
  removeVolumeSchema,
  getNetworksSchema,
  createNetworkSchema,
  removeNetworkSchema,
  searchSchema,
} from "./models/docker.model";

// Utility to check if Docker API is accessible
async function checkDockerHealth(hostUrl: string): Promise<boolean> {
  try {
    return await DockerAPI.checkHealth(hostUrl);
  } catch (error) {
    console.error(error);
    return false;
  }
}

export const dockerRouter = router({
  // Hosts - Get from Cloudflare WARP devices with in-memory metadata
  getHosts: publicProcedure.query(async () => {
    const devices = await getWARPDevices();

    // Enhance with metadata from in-memory store and container counts
    const enhancedHosts = await Promise.all(
      devices.map(async (device) => {
        const metadata = hostStore.get(device.id);

        let containerCount = 0;
        let runningContainers = 0;
        let status: "Online" | "Offline" = "Offline";

        // Try to get container counts (this also checks if host is online)
        try {
          const containers = await DockerAPI.listContainers(
            device.metadata.ipv4,
            true,
          );
          containerCount = containers.length;
          runningContainers = containers.filter(
            (c) => c.state === "running",
          ).length;
          status = "Online";

          // Update store
          hostStore.updateStatus(device.id, true);
          hostStore.updateContainerCounts(
            device.id,
            containerCount,
            runningContainers,
          );
        } catch (error) {
          console.error(
            `Failed to get containers for host ${device.name}:`,
            error,
          );
          hostStore.updateStatus(device.id, false);
        }

        return {
          ...device,
          tunnelUrl: device.metadata.ipv4,
          status: status,
          lastSeen: metadata?.lastSeen ?? null,
          containerCount,
          runningContainers,
        };
      }),
    );

    return enhancedHosts;
  }),

  // Sync hosts - Just update in-memory store with latest status
  syncHosts: publicProcedure.mutation(async () => {
    const devices = await getWARPDevices();
    let onlineCount = 0;

    for (const device of devices) {
      const tunnelUrl = device.metadata.ipv4;
      const isOnline = await checkDockerHealth(tunnelUrl);

      hostStore.updateStatus(device.id, isOnline);

      if (isOnline) onlineCount++;
    }

    return { count: devices.length, onlineCount };
  }),

  // Check status of specific host by deviceId
  checkHostStatus: publicProcedure
    .input(checkHostStatusSchema)
    .mutation(async ({ input }) => {
      const devices = await getWARPDevices();
      const device = devices.find((d) => d.id === input.deviceId);

      if (!device) {
        throw new Error("Device not found in Cloudflare WARP");
      }

      const isOnline = await checkDockerHealth(device.metadata.ipv4);

      // Update in-memory store
      hostStore.updateStatus(device.id, isOnline);

      return { online: isOnline };
    }),

  // Check status of multiple hosts by deviceIds
  checkBulkHostStatus: publicProcedure
    .input(checkBulkHostStatusSchema)
    .mutation(async ({ input }) => {
      const devices = await getWARPDevices();

      const results = await Promise.all(
        input.deviceIds.map(async (deviceId) => {
          const device = devices.find((d) => d.id === deviceId);

          if (!device) {
            return { deviceId, online: false, error: "Device not found" };
          }

          const isOnline = await checkDockerHealth(device.metadata.ipv4);

          // Update in-memory store
          hostStore.updateStatus(device.id, isOnline);

          return { deviceId, online: isOnline };
        }),
      );

      return results;
    }),

  // Ping all hosts to update their status
  pingAllHosts: publicProcedure.mutation(async () => {
    const devices = await getWARPDevices();
    let updatedCount = 0;

    for (const device of devices) {
      const isOnline = await checkDockerHealth(device.metadata.ipv4);
      hostStore.updateStatus(device.id, isOnline);
      if (isOnline) updatedCount++;
    }

    return { totalHosts: devices.length, updatedCount };
  }),

  // Containers on specific host (fetch from Docker API)
  getContainers: publicProcedure
    .input(getContainersSchema)
    .query(async ({ input }) => {
      return await DockerAPI.listContainers(input.hostUrl, true);
    }),

  // Container actions
  performContainerAction: publicProcedure
    .input(performContainerActionSchema)
    .mutation(async ({ input }) => {
      await DockerAPI.performContainerAction(
        input.hostUrl,
        input.containerId,
        input.action,
      );
      return true;
    }),

  // Get container config for editing
  getContainerConfig: publicProcedure
    .input(getContainerConfigSchema)
    .query(async ({ input }) => {
      return await DockerAPI.getContainerConfig(
        input.hostUrl,
        input.containerId,
      );
    }),

  // Modify container (stop, remove, recreate with new config)
  modifyContainer: publicProcedure
    .input(modifyContainerSchema)
    .mutation(async ({ input }) => {
      const newContainerId = await DockerAPI.modifyContainer(
        input.hostUrl,
        input.containerId,
        input.config,
      );
      return { success: true, newContainerId };
    }),

  // Get recent activity logs
  getRecentActivity: publicProcedure
    .input(getRecentActivitySchema)
    .query(async ({ ctx, input }) => {
      return await ctx.db.auditLog.findMany({
        take: input.limit,
        orderBy: { timestamp: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      });
    }),

  // Get aggregate stats across all hosts
  getAggregateStats: publicProcedure.query(async () => {
    const devices = await getWARPDevices();
    let totalContainers = 0;
    let runningContainers = 0;
    let stoppedContainers = 0;
    let pausedContainers = 0;
    let onlineCount = 0;

    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        onlineCount++;
        try {
          const containers = await DockerAPI.listContainers(
            device.metadata.ipv4,
            true,
          );
          totalContainers += containers.length;
          runningContainers += containers.filter(
            (c) => c.state === "running",
          ).length;
          stoppedContainers += containers.filter(
            (c) => c.state === "exited" || c.state === "stopped",
          ).length;
          pausedContainers += containers.filter(
            (c) => c.state === "paused",
          ).length;
        } catch (error) {
          console.error(
            `Failed to get containers for device ${device.name}:`,
            error,
          );
        }
      }
    }

    return {
      totalContainers,
      runningContainers,
      stoppedContainers,
      pausedContainers,
      totalHosts: devices.length,
      onlineHosts: onlineCount,
    };
  }),

  // Get current user from Cloudflare WARP devices
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    const devices = await getWARPDevices();

    // Find devices that have user information
    const devicesWithUsers = devices.filter((d) => d.user && d.user.email);

    if (devicesWithUsers.length === 0) {
      // Fallback user if no WARP devices have user info
      return {
        id: "anonymous",
        email: "user@example.com",
        name: "Dockerflare User",
        role: "User",
      };
    }

    // Use the first device with user info (could be enhanced to pick the "most recent" or "admin" device)
    const primaryDevice = devicesWithUsers[0];
    const cloudflareUser = primaryDevice.user!;

    // Try to find or create user in local database
    let localUser = await ctx.db.user.findUnique({
      where: { email: cloudflareUser.email },
    });

    if (!localUser) {
      // Create user in local database if doesn't exist
      localUser = await ctx.db.user.create({
        data: {
          email: cloudflareUser.email,
          name: `User ${cloudflareUser.email.split("@")[0]}`, // Default name from email
          role: "User", // Default role
        },
      });
    }

    return {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name || `User ${localUser.email.split("@")[0]}`,
      role: localUser.role,
    };
  }),

  // List images on specific host
  getImages: publicProcedure.input(getImagesSchema).query(async ({ input }) => {
    return await DockerAPI.listImages(input.hostUrl);
  }),

  // Pull an image (synchronous - returns immediately, doesn't wait for completion)
  pullImage: publicProcedure
    .input(pullImageSchema)
    .mutation(async ({ input }) => {
      await DockerAPI.pullImage(input.hostUrl, input.imageName);
      return { success: true };
    }),

  // Remove an image
  removeImage: publicProcedure
    .input(removeImageSchema)
    .mutation(async ({ input }) => {
      await DockerAPI.removeImage(input.hostUrl, input.imageId);
      return { success: true };
    }),

  // Get all images from all hosts
  getAllImages: publicProcedure.query(async () => {
    const devices = await getWARPDevices();
    const allImages: NormalizedImage[] = [];

    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const images = await DockerAPI.listImages(device.metadata.ipv4);
          allImages.push(...images);
        } catch (error) {
          console.error(
            `Failed to get images for device ${device.name}:`,
            error,
          );
        }
      }
    }
    return allImages;
  }),

  // List volumes on specific host
  getVolumes: publicProcedure
    .input(getVolumesSchema)
    .query(async ({ input }) => {
      return await DockerAPI.listVolumes(input.hostUrl);
    }),

  // Create a volume
  createVolume: publicProcedure
    .input(createVolumeSchema)
    .mutation(async ({ input }) => {
      const volume = await DockerAPI.createVolume(input.hostUrl, input.name, {
        driver: input.driver,
        labels: input.labels,
      });
      return { success: true, volume };
    }),

  // Remove a volume
  removeVolume: publicProcedure
    .input(removeVolumeSchema)
    .mutation(async ({ input }) => {
      await DockerAPI.removeVolume(input.hostUrl, input.volumeName);
      return { success: true };
    }),

  // Get all volumes from all hosts
  getAllVolumes: publicProcedure.query(async () => {
    const devices = await getWARPDevices();
    const allVolumes: NormalizedVolume[] = [];

    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const volumes = await DockerAPI.listVolumes(device.metadata.ipv4);
          allVolumes.push(...volumes);
        } catch (error) {
          console.error(
            `Failed to get volumes for device ${device.name}:`,
            error,
          );
        }
      }
    }
    return allVolumes;
  }),

  // List networks on specific host
  getNetworks: publicProcedure
    .input(getNetworksSchema)
    .query(async ({ input }) => {
      return await DockerAPI.listNetworks(input.hostUrl);
    }),

  // Create a network
  createNetwork: publicProcedure
    .input(createNetworkSchema)
    .mutation(async ({ input }) => {
      const network = await DockerAPI.createNetwork(input.hostUrl, input.name, {
        driver: input.driver,
        options: input.options,
        labels: input.labels,
        internal: input.internal,
        attachable: input.attachable,
      });
      return { success: true, network };
    }),

  // Remove a network
  removeNetwork: publicProcedure
    .input(removeNetworkSchema)
    .mutation(async ({ input }) => {
      await DockerAPI.removeNetwork(input.hostUrl, input.networkId);
      return { success: true };
    }),

  // Get all networks from all hosts
  getAllNetworks: publicProcedure.query(async () => {
    const devices = await getWARPDevices();
    const allNetworks: NormalizedNetwork[] = [];

    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const networks = await DockerAPI.listNetworks(device.metadata.ipv4);
          allNetworks.push(...networks);
        } catch (error) {
          console.error(
            `Failed to get networks for device ${device.name}:`,
            error,
          );
        }
      }
    }
    return allNetworks;
  }),

  // Unified search across all entities
  search: publicProcedure.input(searchSchema).query(async ({ input }) => {
    const query = input.query.toLowerCase();
    const limit = input.limit;
    type NormalizedResult = {
      id: string;
      type: "host" | "container" | "image" | "volume" | "network";
      name: string;
      url: string;
      category: "Hosts" | "Containers" | "Images" | "Volumes" | "Networks";
      host?: string;
    };
    const results: NormalizedResult[] = [];

    // Search hosts
    const devices = await getWARPDevices();
    const hostResults = devices
      .filter(
        (device) =>
          device.name.toLowerCase().includes(query) ||
          device.metadata.ipv4.includes(query),
      )
      .slice(0, limit)
      .map(
        (device) =>
          ({
            id: device.id,
            type: "host",
            name: device.name,
            url: device.metadata.ipv4,
            category: "Hosts",
          }) satisfies NormalizedResult,
      );

    results.push(...hostResults);

    // Search containers across all hosts
    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const containers = await DockerAPI.listContainers(
            device.metadata.ipv4,
            true,
          );
          const containerResults = containers
            .filter(
              (container) =>
                container.names.some((name) =>
                  name.toLowerCase().includes(query),
                ) || container.image.toLowerCase().includes(query),
            )
            .slice(0, limit)
            .map(
              (container) =>
                ({
                  id: container.id,
                  type: "container",
                  name: container.names[0],
                  url: device.metadata.ipv4,
                  category: "Containers",
                  host: device.name,
                }) satisfies NormalizedResult,
            );
          results.push(...containerResults);
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Search images across all hosts
    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const images = await DockerAPI.listImages(device.metadata.ipv4);
          const imageResults = images
            .filter((image) =>
              image.repoTags?.some((tag) => tag.toLowerCase().includes(query)),
            )
            .slice(0, limit)
            .map(
              (image) =>
                ({
                  id: image.id,
                  type: "image",
                  name: image.repoTags[0] || "untagged",
                  url: device.metadata.ipv4,
                  category: "Images",
                  host: device.name,
                }) satisfies NormalizedResult,
            );
          results.push(...imageResults);
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Search volumes across all hosts
    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const volumes = await DockerAPI.listVolumes(device.metadata.ipv4);
          const volumeResults = volumes
            .filter((volume) => volume.name.toLowerCase().includes(query))
            .slice(0, limit)
            .map(
              (volume) =>
                ({
                  id: volume.name,
                  type: "volume",
                  name: volume.name,
                  url: device.metadata.ipv4,
                  category: "Volumes",
                  host: device.name,
                }) satisfies NormalizedResult,
            );
          results.push(...volumeResults);
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Search networks across all hosts
    for (const device of devices) {
      const metadata = hostStore.get(device.id);
      const isOnline = metadata?.status === "Online";

      if (isOnline) {
        try {
          const networks = await DockerAPI.listNetworks(device.metadata.ipv4);
          const networkResults = networks
            .filter((network) => network.name?.toLowerCase().includes(query))
            .slice(0, limit)
            .map(
              (network) =>
                ({
                  id: network.id,
                  type: "network",
                  name: network.name,
                  url: device.metadata.ipv4,
                  category: "Networks",
                  host: device.name,
                }) satisfies NormalizedResult,
            );
          results.push(...networkResults);
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Limit total results
    return results.slice(0, limit);
  }),
});

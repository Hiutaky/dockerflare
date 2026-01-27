import { router } from "../trpc";
import { publicProcedure } from "../trpc";
import { z } from "zod";
import { getWARPDevices } from "../cloudflare";
import * as DockerAPI from "../docker-client";
import { hostStore } from "../host-store";
import { NormalizedImage } from "@/types";
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
});

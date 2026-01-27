import z from "zod";

export const checkHostStatusSchema = z.object({ deviceId: z.string() });
export const checkBulkHostStatusSchema = z.object({
  deviceIds: z.array(z.string()),
});
export const getContainersSchema = z.object({ hostUrl: z.string() });
export const performContainerActionSchema = z.object({
  hostUrl: z.string(),
  containerId: z.string(),
  action: z.enum(["start", "stop", "restart", "pause", "unpause", "remove"]),
});
export const getContainerConfigSchema = z.object({
  hostUrl: z.string(),
  containerId: z.string(),
});
export const modifyContainerSchema = z.object({
  hostUrl: z.string(),
  containerId: z.string(),
  config: z.object({
    name: z.string().optional(),
    Image: z.string(),
    Env: z.array(z.string()).optional(),
    Cmd: z.array(z.string()).optional(),
    Entrypoint: z.array(z.string()).optional(),
    WorkingDir: z.string().optional(),
    Labels: z.record(z.string(), z.string()).optional(),
    ExposedPorts: z.record(z.string(), z.any()).optional(),
    HostConfig: z
      .object({
        PortBindings: z
          .record(z.string(), z.array(z.object({ HostPort: z.string() })))
          .optional(),
        Binds: z.array(z.string()).optional(),
        Memory: z.number().optional(),
        MemoryReservation: z.number().optional(),
        CpuShares: z.number().optional(),
        CpuQuota: z.number().optional(),
        CpuPeriod: z.number().optional(),
        RestartPolicy: z
          .object({
            Name: z.enum(["no", "always", "on-failure", "unless-stopped"]),
            MaximumRetryCount: z.number().optional(),
          })
          .optional(),
        NetworkMode: z.string().optional(),
        Privileged: z.boolean().optional(),
        CapAdd: z.array(z.string()).optional(),
        CapDrop: z.array(z.string()).optional(),
      })
      .optional(),
    NetworkingConfig: z
      .object({
        EndpointsConfig: z.record(z.string(), z.any()).optional(),
      })
      .optional(),
  }),
});
export const getRecentActivitySchema = z.object({
  limit: z.number().optional().default(10),
});
export const getImagesSchema = z.object({ hostUrl: z.string() });
export const pullImageSchema = z.object({
  hostUrl: z.string(),
  imageName: z.string(),
});
export const removeImageSchema = z.object({
  hostUrl: z.string(),
  imageId: z.string(),
});

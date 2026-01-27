/**
 * Docker API Native Client
 * Direct HTTP connection to Docker Engine API on port 2375
 */

import type * as Dockerode from "dockerode";
import { NormalizedContainer, NormalizedImage } from "@/types";

const DOCKER_PORT = 2375;

/**
 * Build Docker API URL
 */
function buildDockerUrl(host: string, path: string): string {
  return `http://${host}:${DOCKER_PORT}${path}`;
}

/**
 * Normalize Docker API container to application format
 */
function normalizeContainer(
  container: Dockerode.ContainerInfo,
  host: string,
): NormalizedContainer {
  return {
    id: container.Id,
    names: container.Names,
    image: container.Image,
    imageID: container.ImageID,
    state: container.State,
    status: container.Status,
    created: container.Created,
    ports: (container.Ports || []).map((p) =>
      p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`,
    ),
    labels: container.Labels,
    host,
  };
}

/**
 * Normalize Docker API image to application format
 */
function normalizeImage(
  image: Dockerode.ImageInfo,
  host: string,
): NormalizedImage {
  return {
    id: image.Id,
    repoTags: image.RepoTags || [],
    repoDigests: image.RepoDigests,
    created: image.Created,
    size: image.Size,
    virtualSize: image.VirtualSize,
    labels: image.Labels,
    host,
  };
}

/**
 * List all containers
 */
export async function listContainers(
  host: string,
  all: boolean = true,
): Promise<NormalizedContainer[]> {
  const url = buildDockerUrl(host, `/containers/json?all=${all}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to list containers: ${response.statusText}`);
  }

  const containers: Dockerode.ContainerInfo[] = await response.json();
  return containers.map((c) => normalizeContainer(c, host));
}

/**
 * Inspect a container
 */
export async function inspectContainer(
  host: string,
  containerId: string,
): Promise<Dockerode.ContainerInspectInfo> {
  const url = buildDockerUrl(host, `/containers/${containerId}/json`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to inspect container: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Perform container action (start, stop, restart, pause, unpause, remove)
 */
export async function performContainerAction(
  host: string,
  containerId: string,
  action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove",
): Promise<void> {
  let response;
  if (action !== "remove") {
    const url = buildDockerUrl(host, `/containers/${containerId}/${action}`);
    response = await fetch(url, { method: "POST" });
  } else {
    const url = buildDockerUrl(host, `/containers/${containerId}`);
    response = await fetch(url, { method: "DELETE" });
  }

  if (!response.ok && response.status !== 304) {
    // 304 = already started/stopped
    throw new Error(`Failed to ${action} container: ${response.statusText}`);
  }
}

/**
 * Health check - verify Docker API is accessible
 */
export async function checkHealth(host: string): Promise<boolean> {
  try {
    const url = buildDockerUrl(host, "/_ping");
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok && (await response.text()) === "OK";
  } catch {
    return false;
  }
}

/**
 * Modify container by stopping, removing, and recreating with new config
 */
export async function modifyContainer(
  host: string,
  containerId: string,
  newConfig: Dockerode.ContainerCreateOptions,
): Promise<string> {
  // Get current container info
  const inspectInfo = await inspectContainer(host, containerId);

  // Stop container if running
  if (inspectInfo.State.Running) {
    await performContainerAction(host, containerId, "stop");
  }

  // Remove container
  await performContainerAction(host, containerId, "remove");

  // Create new container with updated config
  const createUrl = buildDockerUrl(host, "/containers/create");
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newConfig),
  });

  if (!createResponse.ok) {
    throw new Error(
      `Failed to create modified container: ${createResponse.statusText}`,
    );
  }

  const { Id } = await createResponse.json();

  // Start the new container
  await performContainerAction(host, Id, "start");

  return Id;
}

/**
 * Extract container configuration for editing
 */
export async function getContainerConfig(
  host: string,
  containerId: string,
): Promise<Dockerode.ContainerCreateOptions> {
  const inspectInfo = await inspectContainer(host, containerId);

  // Extract and format config for editor
  return {
    Image: inspectInfo.Image,
    Env: Object.entries(inspectInfo.Config.Env || []).map(
      ([k, v]) => `${k}=${v}`,
    ),
    Cmd: inspectInfo.Config.Cmd,
    Entrypoint: inspectInfo.Config.Entrypoint,
    WorkingDir: inspectInfo.Config.WorkingDir,
    HostConfig: {
      Binds: inspectInfo.HostConfig.Binds,
      PortBindings: inspectInfo.HostConfig.PortBindings,
      RestartPolicy: inspectInfo.HostConfig.RestartPolicy,
      Memory: inspectInfo.HostConfig.Memory,
      MemoryReservation: inspectInfo.HostConfig.MemoryReservation,
      CpuShares: inspectInfo.HostConfig.CpuShares,
      CpuQuota: inspectInfo.HostConfig.CpuQuota,
      CpuPeriod: inspectInfo.HostConfig.CpuPeriod,
      NetworkMode: inspectInfo.HostConfig.NetworkMode,
      Privileged: inspectInfo.HostConfig.Privileged,
      CapAdd: inspectInfo.HostConfig.CapAdd,
      CapDrop: inspectInfo.HostConfig.CapDrop,
    },
    Labels: inspectInfo.Config.Labels,
    ExposedPorts: inspectInfo.Config.ExposedPorts,
    NetworkingConfig: inspectInfo.NetworkSettings.Networks
      ? {
          EndpointsConfig: Object.keys(
            inspectInfo.NetworkSettings.Networks,
          ).reduce((acc, network) => {
            acc[network] = {};
            return acc;
          }, {} as Dockerode.EndpointsConfig),
        }
      : undefined,
  };
}

/**
 * List all images
 */
export async function listImages(host: string): Promise<NormalizedImage[]> {
  const url = buildDockerUrl(host, "/images/json");
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to list images: ${response.statusText}`);
  }

  const images: Dockerode.ImageInfo[] = await response.json();
  return images.map((img) => normalizeImage(img, host));
}

/**
 * Pull an image
 */
export async function pullImage(
  host: string,
  imageName: string,
): Promise<void> {
  const url = buildDockerUrl(
    host,
    `/images/create?fromImage=${encodeURIComponent(imageName)}`,
  );
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    throw new Error(
      `Failed to pull image ${imageName}: ${response.statusText}`,
    );
  }
}

/**
 * Remove an image
 */
export async function removeImage(
  host: string,
  imageId: string,
): Promise<void> {
  const url = buildDockerUrl(host, `/images/${imageId}`);
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(
      `Failed to remove image ${imageId}: ${response.statusText}`,
    );
  }
}

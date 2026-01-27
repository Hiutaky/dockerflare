import {
  ComposeConfig,
  ContainerConnection,
  DeployConfig,
  SendTopicFunction,
} from "@/types";
import Dockerode from "dockerode";
import { Duplex } from "stream";

/* ---------------------------------- Deploy Container ---------------------------------- */
export async function deployContainer(
  connection: ContainerConnection,
  send: SendTopicFunction,
  config: DeployConfig,
) {
  const { ws, docker } = connection;
  try {
    console.log(`[UNIFIED WS] Starting container deployment`);

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Starting deployment...\n`,
    });

    // Step 1: Pull image
    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Pulling image: ${config.image}\n`,
    });

    const pullStream = (await docker.pull(config.image)) as Duplex;

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        pullStream,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        },
        (event) => {
          if (ws.readyState === WebSocket.OPEN && event.status) {
            const progress = event.progressDetail
              ? ` [${event.progressDetail.current}/${event.progressDetail.total}]`
              : "";
            send({
              type: "logs",
              topic: "deployment",
              data: `[${new Date().toISOString()}] ${event.status}${progress}\n`,
            });
          }
        },
      );
    });

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Image pulled successfully\n`,
    });

    // Step 2: Create container
    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Creating container: ${config.name || "auto"}\n`,
    });

    // Build container configuration
    const containerConfig: Dockerode.ContainerCreateOptions = {
      Image: config.image,
      name: config.name,
    };

    if (config.env && config.env.length > 0) {
      containerConfig.Env = config.env.map((e) => `${e.key}=${e.value}`);
    }

    if (config.cmd) {
      containerConfig.Cmd = config.cmd;
    }

    // Port bindings
    if (config.ports && config.ports.length > 0) {
      containerConfig.ExposedPorts = {};
      containerConfig.HostConfig = containerConfig.HostConfig || {};
      containerConfig.HostConfig.PortBindings = {};
      for (const port of config.ports) {
        const containerPort = `${port.container}/tcp`;
        containerConfig.ExposedPorts[containerPort] = {};
        containerConfig.HostConfig.PortBindings[containerPort] = [
          { HostPort: port.host },
        ];
      }
    }

    // Volume bindings
    if (config.volumes && config.volumes.length > 0) {
      containerConfig.HostConfig = containerConfig.HostConfig || {};
      containerConfig.HostConfig.Binds = config.volumes.map(
        (v) => `${v.host}:${v.container}`,
      );
    }

    // Resources
    containerConfig.HostConfig = containerConfig.HostConfig || {};
    if (config.memory) {
      containerConfig.HostConfig.Memory = config.memory * 1024 * 1024; // Convert MB to bytes
    }
    if (config.cpuShares) {
      containerConfig.HostConfig.CpuShares = config.cpuShares;
    }

    // Restart policy
    if (config.restartPolicy) {
      containerConfig.HostConfig.RestartPolicy = {
        Name: config.restartPolicy,
        MaximumRetryCount: config.restartPolicy === "on-failure" ? 3 : 0,
      };
    }

    const container = await docker.createContainer(containerConfig);

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Container created: ${container.id}\n`,
    });

    // Step 3: Start container
    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Starting container...\n`,
    });

    await container.start();

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Container started successfully\n`,
    });

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Deployment complete!\n`,
    });

    // Send success with container ID
    send({
      type: "deployment_complete",
      topic: "deployment",
      data: {
        containerId: container.id,
        status: "success",
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[UNIFIED WS] Deployment error:`, err);
    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] ERROR: ${err.message}\n`,
    });

    send({
      type: "deployment_complete",
      topic: "deployment",
      data: {
        status: "error",
        error: err.message,
      },
    });
  }
}

/* ---------------------------------- Deploy Compose Stack ------------------------------ */
export async function deployComposeStack(
  connection: ContainerConnection,
  send: SendTopicFunction,
  composeConfig: ComposeConfig,
) {
  const { docker } = connection;
  try {
    console.log(`[UNIFIED WS] Starting compose deployment`);

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Starting compose deployment: ${composeConfig.projectName}\n`,
    });

    const createdContainers: string[] = [];

    // Step 1: Create networks
    if (composeConfig.networks) {
      for (const [networkName, networkConfig] of Object.entries(
        composeConfig.networks,
      )) {
        try {
          send({
            type: "logs",
            topic: "deployment",
            data: `[${new Date().toISOString()}] Creating network: ${networkName}\n`,
          });

          const network = await docker.createNetwork({
            Name: `${composeConfig.projectName}_${networkName}`,
            Driver: networkConfig || "bridge",
          });

          send({
            type: "logs",
            topic: "deployment",
            data: `[${new Date().toISOString()}] Network created: ${network.id}\n`,
          });
        } catch (err) {
          if (
            !(err as { message: string }).message.includes("already exists")
          ) {
            throw err;
          }
          send({
            type: "logs",
            topic: "deployment",
            data: `[${new Date().toISOString()}] Network ${networkName} already exists\n`,
          });
        }
      }
    }

    // Step 2: Create volumes
    if (composeConfig.volumes) {
      for (const [volumeName, volumeConfig] of Object.entries(
        composeConfig.volumes,
      )) {
        try {
          send({
            type: "logs",
            topic: "deployment",
            data: `[${new Date().toISOString()}] Creating volume: ${volumeName}\n`,
          });

          await docker.createVolume({
            Name: `${composeConfig.projectName}_${volumeName}`,
            Driver: volumeConfig || "local",
          });

          send({
            type: "logs",
            topic: "deployment",
            data: `[${new Date().toISOString()}] Volume created: ${volumeName}\n`,
          });
        } catch (err) {
          if (
            !(err as { message: string })?.message?.includes("already exists")
          ) {
            throw err;
          }
        }
      }
    }

    // Step 3: Deploy services
    for (const [serviceName, serviceConfig] of Object.entries(
      composeConfig.services,
    )) {
      const service = serviceConfig;

      send({
        type: "logs",
        topic: "deployment",
        data: `[${new Date().toISOString()}] Deploying service: ${serviceName}\n`,
      });

      // Pull image
      send({
        type: "logs",
        topic: "deployment",
        data: `[${new Date().toISOString()}] Pulling image: ${service.image}\n`,
      });

      const pullStream = (await docker.pull(
        service.image,
      )) as unknown as Duplex;
      await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(pullStream, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Build container config
      const containerConfig: Partial<Dockerode.ContainerCreateOptions> = {
        Image: service.image,
        name:
          service.container_name ||
          `${composeConfig.projectName}_${serviceName}_1`,
      };

      // Environment variables
      if (service.environment) {
        containerConfig.Env = Object.entries(service.environment).map(
          ([key, value]) => `${key}=${value}`,
        );
      }

      // Exposed ports and port bindings
      if (service.ports) {
        containerConfig.ExposedPorts = {};
        containerConfig.HostConfig = { PortBindings: {} };

        service.ports.forEach((portMapping: string) => {
          const [hostPort, containerPort] = portMapping.split(":");
          const containerPortKey = `${containerPort}/tcp`;
          containerConfig.ExposedPorts![containerPortKey] = {};
          containerConfig.HostConfig!.PortBindings[containerPortKey] = [
            { HostPort: hostPort },
          ];
        });
      }

      // Volumes
      if (service.volumes) {
        containerConfig.HostConfig = containerConfig.HostConfig || {};
        containerConfig.HostConfig.Binds = service.volumes;
      }

      // Networks
      if (service.networks) {
        containerConfig.NetworkingConfig = {
          EndpointsConfig: {},
        };
        service.networks.forEach((network: string) => {
          containerConfig.NetworkingConfig!.EndpointsConfig![
            `${composeConfig.projectName}_${network}`
          ] = {};
        });
      }

      // Restart policy
      if (service.restart) {
        containerConfig.HostConfig = containerConfig.HostConfig || {};
        containerConfig.HostConfig.RestartPolicy = {
          Name:
            service.restart === "unless-stopped"
              ? "unless-stopped"
              : service.restart === "always"
                ? "always"
                : "no",
        };
      }

      // Create and start container
      const container = await docker.createContainer(containerConfig);
      await container.start();

      createdContainers.push(container.id);

      send({
        type: "logs",
        topic: "deployment",
        data: `[${new Date().toISOString()}] Service ${serviceName} deployed: ${container.id}\n`,
      });
    }

    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] Compose deployment complete!\n`,
    });

    send({
      type: "deployment_complete",
      topic: "deployment",
      data: {
        status: "success",
        containerIds: createdContainers,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[UNIFIED WS] Compose deployment error:`, err);
    send({
      type: "logs",
      topic: "deployment",
      data: `[${new Date().toISOString()}] ERROR: ${err.message}\n`,
    });

    send({
      type: "deployment_complete",
      topic: "deployment",
      data: {
        status: "error",
        error: err.message,
      },
    });
  }
}

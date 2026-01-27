import { ContainerConnection, SendTopicFunction } from "@/types";
import { ContainerStats } from "dockerode";
import { Duplex } from "stream";

/* ---------------------------------- Subscribe to Stats -------------------------------- */
export async function subscribeToStats(
  connection: ContainerConnection,
  send: SendTopicFunction,
) {
  const { containerId, docker, ws } = connection;
  try {
    console.log(`[UNIFIED WS] Subscribing to stats for ${containerId}`);

    console.log("connections", connection.subscriptions);

    const container = docker.getContainer(containerId);
    const statsStream = (await container.stats({ stream: true })) as Duplex;

    connection.subscriptions.set("stats", {
      topic: "stats",
      stream: statsStream,
    });

    let buffer = "";

    statsStream.on("data", (chunk: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const rawStats = JSON.parse(line) as ContainerStats;

            // Calculate CPU percentage
            const cpuDelta =
              rawStats.cpu_stats.cpu_usage.total_usage -
              (rawStats.precpu_stats?.cpu_usage?.total_usage || 0);
            const systemDelta =
              rawStats.cpu_stats.system_cpu_usage -
              (rawStats.precpu_stats?.system_cpu_usage || 0);
            const cpuPercent =
              systemDelta > 0
                ? (cpuDelta / systemDelta) *
                  rawStats.cpu_stats.online_cpus *
                  100
                : 0;

            const stats = {
              cpu_percent: Math.round(cpuPercent * 100) / 100,
              memory_usage: rawStats.memory_stats?.usage || 0,
              memory_limit: rawStats.memory_stats?.limit || 0,
              network_rx: rawStats.networks?.eth0?.rx_bytes || 0,
              network_tx: rawStats.networks?.eth0?.tx_bytes || 0,
              block_read:
                rawStats.blkio_stats?.io_service_bytes_recursive?.find(
                  (io) => io.op === "read" || io.op === "Read",
                )?.value || 0,
              block_write:
                rawStats.blkio_stats?.io_service_bytes_recursive?.find(
                  (io) => io.op === "write" || io.op === "Write",
                )?.value || 0,
            };

            send({
              type: "stats",
              topic: "stats",
              data: stats,
            });
          } catch (err) {
            console.error("[UNIFIED WS] Failed to parse stats JSON:", err);
          }
        }
      }
    });

    statsStream.on("error", (error: Error) => {
      console.error(`[UNIFIED WS] Stats stream error:`, error);
      send({
        type: "error",
        topic: "stats",
        error: error.message,
      });
    });

    send({
      type: "subscribed",
      topic: "stats",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[UNIFIED WS] Error subscribing to stats:`, err);
    send({
      type: "error",
      topic: "stats",
      error: err.message,
    });
  }
}

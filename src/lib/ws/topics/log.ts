import { ClientMessage, ContainerConnection, SendTopicFunction } from "@/types";
import { Duplex } from "stream";

/* ---------------------------------- Subscribe to Logs --------------------------------- */
export async function subscribeToLogs(
  connection: ContainerConnection,
  send: SendTopicFunction,
  options: ClientMessage["options"] = {},
) {
  const { tail = 100, timestamps = true } = options;
  const { containerId, ws } = connection;

  try {
    console.log(`[UNIFIED WS] Subscribing to logs for ${containerId}`);

    const container = connection.docker.getContainer(containerId);
    const logsStream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail,
      timestamps,
    })) as Duplex;

    logsStream.on("data", (chunk: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Clean Docker multiplexed stream format
        const text = chunk
          .toString("utf8")
          .replace(/^[\x00-\x02]\x00\x00\x00\x00\x00\x00./gm, "");
        send({
          type: "logs",
          topic: "logs",
          data: text,
        });
      }
    });

    logsStream.on("error", (error: Error) => {
      console.error(`[UNIFIED WS] Logs stream error:`, error);
      send({
        type: "error",
        topic: "logs",
        error: error.message,
      });
    });

    connection.subscriptions.set("logs", { topic: "logs", stream: logsStream });

    send({
      type: "subscribed",
      topic: "logs",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[UNIFIED WS] Error subscribing to logs:`, err);
    send({
      type: "error",
      topic: "logs",
      error: err.message,
    });
  }
}

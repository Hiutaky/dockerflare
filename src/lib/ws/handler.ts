import {
  ClientMessage,
  ContainerConnection,
  ServerMessage,
  Topics,
} from "@/types";
import Dockerode from "dockerode";
import { IncomingMessage } from "http";
import { deployComposeStack, deployContainer } from "./topics/deploy";
import { subscribeToLogs } from "./topics/log";
import { subscribeToStats } from "./topics/stats";
import { subscribeToTerminal } from "./topics/terminal";

const containerConnections = new Map<string, ContainerConnection>();
const subQueue = new Map<string, Topics[]>();

export async function handleWebSocketRequest(
  ws: WebSocket,
  request: IncomingMessage,
  dockerHost: string,
  containerId: string,
) {
  const connectionId = `ws-${containerId}-${Date.now()}`;
  console.log(
    `[UNIFIED WS] New connection: ${connectionId} for container ${containerId}`,
  );
  const send = (obj: ServerMessage) => {
    return ws.send(JSON.stringify(obj));
  };

  let docker: Dockerode;
  try {
    docker = new Dockerode({
      host: dockerHost,
      port: 2375,
      protocol: "http",
    });
  } catch (err) {
    const error = err as Error;
    console.error(
      `[UNIFIED WS] Failed to connect to Docker on ${dockerHost}:`,
      error,
    );
    send({
      type: "error",
      error: `Failed to connect to Docker: ${error.message}`,
    });
    ws.close();
    return;
  }

  // Store connection
  const connection: ContainerConnection = {
    ws,
    docker,
    containerId,
    dockerHost,
    subscriptions: new Map(),
    heartbeat: null,
  };

  containerConnections.set(connectionId, connection);
  subQueue.set(connectionId, []);
  // Send ready message
  send({
    type: "connected",
    containerId,
    connectionId,
  });

  // Heartbeat
  connection.heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      send({ type: "ping" });
    }
  }, 30000);

  /* ---------------------------------- Unsubscribe from Topic ---------------------------- */
  function unsubscribeFromTopic(
    topic: "logs" | "stats" | "terminal" | "deployment",
  ) {
    const subscription = connection.subscriptions.get(topic);
    if (!subscription) return;

    console.log(`[UNIFIED WS] Unsubscribing from ${topic} for ${containerId}`);

    if (subscription.stream) {
      try {
        subscription.stream.destroy();
      } catch (err) {
        console.error(`[UNIFIED WS] Error destroying ${topic} stream:`, err);
      }
    }

    if (subscription.interval) {
      clearInterval(subscription.interval);
    }

    connection.subscriptions.delete(topic);

    send({
      type: "unsubscribed",
      topic,
    });
  }

  /* ---------------------------------- Handle WebSocket Messages ------------------------- */
  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data.toString()) as ClientMessage;

      if (message.type === "pong") {
        return;
      }

      if (message.type === "subscribe" && message.topic) {
        const subscribedTopics = subQueue.get(connectionId);
        if (!subscribedTopics?.includes(message.topic)) {
          subQueue.set(connectionId, [
            ...(subscribedTopics?.values() ?? []),
            message.topic,
          ]);
          switch (message.topic) {
            case "logs":
              await subscribeToLogs(connection, send, message.options);
              break;
            case "stats":
              await subscribeToStats(connection, send);
              break;
            case "terminal":
              await subscribeToTerminal(connection, send);
              break;
          }
        } else console.log("Already subscribed", message.topic);
      }

      if (message.type === "unsubscribe" && message.topic) {
        unsubscribeFromTopic(message.topic);
      }

      if (message.type === "terminal_input") {
        const terminalSub = connection.subscriptions.get("terminal");
        if (terminalSub?.stream && message.data) {
          terminalSub.stream.write(message.data);
        }
      }

      if (message.type === "terminal_resize") {
        const terminalSub = connection.subscriptions.get("terminal");
        if (terminalSub?.stream && message.rows && message.cols) {
          if (terminalSub.id) {
            const exec = connection.docker.getExec(terminalSub.id);
            await exec.resize({ h: message.rows, w: message.cols });
          }
        }
      }

      if (message.type === "deploy_container" && message.deployConfig) {
        await deployContainer(connection, send, message.deployConfig);
      }

      if (message.type === "deploy_compose" && message.composeConfig) {
        await deployComposeStack(connection, send, message.composeConfig);
      }
    } catch (err) {
      console.error(`[UNIFIED WS] Error handling message:`, err);
    }
  };

  /* ---------------------------------- Handle WebSocket Close ---------------------------- */
  ws.onclose = () => {
    console.log(`[UNIFIED WS] Connection closed: ${connectionId}`);

    if (connection.heartbeat) {
      clearInterval(connection.heartbeat);
    }

    // Clean up all subscriptions
    connection.subscriptions.forEach((subscription, topic) => {
      if (subscription.stream) {
        try {
          subscription.stream.destroy();
        } catch (err) {
          console.error(`[UNIFIED WS] Error destroying ${topic} stream:`, err);
        }
      }
      if (subscription.interval) {
        clearInterval(subscription.interval);
      }
    });

    connection.subscriptions.clear();
    containerConnections.delete(connectionId);
  };

  ws.onerror = (event) => {
    console.error(`[UNIFIED WS] WebSocket error:`, event);
  };
}

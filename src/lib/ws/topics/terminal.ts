import { ContainerConnection, SendTopicFunction } from "@/types";
import Dockerode from "dockerode";
import { Duplex } from "stream";

/* ---------------------------------- Subscribe to Terminal ----------------------------- */
export async function subscribeToTerminal(
  connection: ContainerConnection,
  send: SendTopicFunction,
) {
  const { containerId, docker } = connection;
  try {
    console.log(`[UNIFIED WS] Subscribing to terminal for ${containerId}`);

    const container = docker.getContainer(containerId);

    let exec: Dockerode.Exec;

    try {
      exec = await container.exec({
        Cmd: ["/bin/bash"],
        Env: ["TERM=xterm-256color"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      });
    } catch (e) {
      console.log("[BASH Error] Bash not found, fallback to Dash");
      exec = await container.exec({
        Cmd: ["/bin/sh"],
        Env: ["TERM=xterm-256color"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      });
    }

    const execStream = (await exec.start({
      hijack: true,
      stdin: true,
      Tty: true,
    })) as Duplex;

    execStream.on("data", (chunk: Buffer) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        send({
          type: "terminal_output",
          topic: "terminal",
          data: chunk.toString("utf8"),
        });
      }
    });

    execStream.on("end", () => {
      console.log(`[UNIFIED WS] Terminal stream ended for ${containerId}`);
      send({
        type: "terminal_end",
        topic: "terminal",
        containerId,
      });
    });

    execStream.on("error", (error: Error) => {
      console.error(`[UNIFIED WS] Terminal stream error:`, error);
      send({
        type: "error",
        topic: "terminal",
        error: error.message,
      });
    });
    connection.subscriptions.set("terminal", {
      topic: "terminal",
      stream: execStream,
      id: exec.id,
    });

    send({
      type: "subscribed",
      topic: "terminal",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[UNIFIED WS] Error subscribing to terminal:`, err);
    send({
      type: "error",
      topic: "terminal",
      error: err.message,
    });
  }
}

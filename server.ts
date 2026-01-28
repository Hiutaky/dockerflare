/**
 * Custom Next.js Server with Unified WebSocket Support for Docker
 * Single WebSocket per container with topic-based subscriptions (logs, stats, terminal)
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { Duplex } from "stream";
import { handleWebSocketRequest } from "@/lib/ws/handler";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
//

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // WebSocket Server for Unified Docker Communication
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleWebSocketRequest);

  // Handle WebSocket upgrade
  server.on(
    "upgrade",
    (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const { pathname, query } = parse(request.url!, true);

      // Unified WebSocket endpoint: /api/docker/ws/:containerId?host=...
      const unifiedMatch = pathname?.match(/^\/api\/docker\/ws\/([^/]+)$/);
      if (unifiedMatch) {
        const containerId = unifiedMatch[1];
        const dockerHost = query.host as string | undefined;

        if (!dockerHost) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          wss.emit("connection", ws, request, dockerHost, containerId);
        });
        return;
      }

      if (pathname?.startsWith("/_next/")) {
        handle(request, new ServerResponse(request));
        return;
      }
      socket.destroy();
    },
  );

  server.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(
      `> Unified WebSocket server ready for Docker (logs, stats, terminal)`,
    );
  });
});

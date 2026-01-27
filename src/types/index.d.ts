import type * as Dockerode from "dockerode";

/**
 * Websocket Types
 */
export type Topics = "logs" | "stats" | "terminal" | "deployment";
interface ClientMessage {
  type:
    | "subscribe"
    | "unsubscribe"
    | "terminal_input"
    | "terminal_resize"
    | "pong"
    | "deploy_container"
    | "deploy_compose";
  topic?: Topics;
  data?: string;
  options?: {
    follow?: boolean;
    tail?: number;
    timestamps?: boolean;
  };
  rows?: number;
  cols?: number;
  // Deployment specific
  deployConfig?: DeployConfig;
  composeConfig?: ComposeConfig;
}

interface ComposeConfig {
  projectName: string;
  networks?: string[];
  services: Record<string, ServiceConfig>;
  volumes: string[];
}
interface ServiceConfig {
  image: string;
  container_name: string;
  ports: string[];
  environment: Record<string, string>;
  volumes: string[];
  networks?: string[];
  restart: RestartPolicy;
  depends_on?: string[];
}
interface DeployConfig {
  name: string;
  image: string;
  cmd?: string[];
  env: Array<Env>;
  ports: Array<Port>;
  volumes: Array<Volume>;
  memory: number;
  cpuShares: number;
  restartPolicy: RestartPolicy;
}

interface ServerMessage {
  type:
    | "logs"
    | "stats"
    | "terminal_output"
    | "connected"
    | "error"
    | "subscribed"
    | "unsubscribed"
    | "ping"
    | "terminal_end"
    | "deployment_complete";
  topic?: string;
  data?: unknown;
  error?: string;
  containerId?: string;
  connectionId?: string;
}

interface ActiveSubscription {
  topic: "logs" | "stats" | "terminal" | "deployment";
  id?: string;
  stream?: Duplex;
  abortController?: AbortController;
  interval?: NodeJS.Timeout;
}

interface ContainerConnection {
  ws: WebSocket;
  docker: Dockerode;
  containerId: string;
  dockerHost: string;
  subscriptions: Map<string, ActiveSubscription>;
  heartbeat: NodeJS.Timeout | null;
}

export type SendTopicFunction = (message: ServerMessage) => void;

interface TerminalInstance {
  id: string;
  containerId: string;
  containerName: string;
  hostUrl: string;
}

interface TerminalGridCell {
  terminalId: string | null;
  position: { row: number; col: number };
}

/**
 * Docker Client Types
 *
 * We use Dockerode types directly to avoid duplication:
 * - Dockerode.ContainerInfo (list containers response)
 * - Dockerode.ContainerInspectInfo (inspect container response)
 * - Dockerode.ContainerStats (stats stream response)
 */

// Application-specific types
export type Env = {
  key: string;
  value: string;
  description?: string;
};
export type Port = {
  host: string;
  container: string;
  description?: string;
};
export type Volume = {
  host: string;
  container: string;
  description?: string;
};
export type RestartPolicy = "no" | "always" | "on-failure" | "unless-stopped";

export type ContainerState = "running" | "stopped" | "paused" | "exited";
// Normalized container format (lowercase fields for application use)
export interface NormalizedContainer {
  id: string;
  names: string[];
  image: string;
  imageID?: string;
  state: string;
  status: string;
  created: number;
  ports?: string[];
  labels?: Record<string, string>;
  // Additional fields for unified container view
  host: string;
}

// Simplified stats for UI components (processed from Dockerode.ContainerStats)
export interface ContainerStats {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  network_rx: number;
  network_tx: number;
  block_read: number;
  block_write: number;
}

// Normalized image format (lowercase fields for application use)
export interface NormalizedImage {
  id: string;
  repoTags: string[];
  repoDigests?: string[];
  created: number;
  size: number;
  virtualSize: number;
  labels?: Record<string, string>;
  // Additional fields for unified image view
  host: string;
}

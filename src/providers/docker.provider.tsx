"use client";

/**
 * Unified Docker Provider with WebSocket (Topic-based subscriptions)
 * Single WebSocket connection per container with dynamic topic subscriptions
 * Topics: logs, stats, terminal
 */
/* -------------------------------------------------------------------------- */
/*                                   IMPORTS                                  */
/* -------------------------------------------------------------------------- */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc-client";
import { NormalizedContainer } from "@/types";
import { RouterOutputs } from "@/lib/routers";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export type ChannelType = "logs" | "terminal" | "stats";

export interface ContainerStats {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  network_rx: number;
  network_tx: number;
  block_read: number;
  block_write: number;
}

interface ClientMessage {
  type:
    | "subscribe"
    | "unsubscribe"
    | "terminal_input"
    | "terminal_resize"
    | "pong";
  topic?: ChannelType;
  data?: string;
  options?: {
    follow?: boolean;
    tail?: number;
    timestamps?: boolean;
  };
  rows?: number;
  cols?: number;
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
    | "terminal_end";
  topic?: string;
  data?: object; // must improve type
  error?: string;
  containerId?: string;
  connectionId?: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  containerId: string;
  hostUrl: string;
  subscribedTopics: Set<ChannelType>;
  // Callbacks per topic
  logsCallbacks: Set<(logs: string) => void>;
  statsCallbacks: Set<(stats: ContainerStats) => void>;
  terminalCallbacks: Set<(output: string) => void>;
  // Accumulated data
  logsData: string;
  terminalData: string;
  isConnected: boolean;
  reconnectAttempts: number;
}
type DockerProviderLoadState = "init" | "host" | "containers" | "ready";

/* -------------------------------------------------------------------------- */
/*                                 INTERFACES                                 */
/* -------------------------------------------------------------------------- */

interface Props {
  children: ReactNode;
}

interface DockerState {
  // State
  containers: Map<string, NormalizedContainer[]>;
  selectedContainer: NormalizedContainer | null;
  selectedHost: string | null;
  isLoading: boolean;
  error: string | null;
  loadState: DockerProviderLoadState;
  firstRun: boolean;
  onlineHosts: RouterOutputs["docker"]["getHosts"];
  hosts: RouterOutputs["docker"]["getHosts"];

  // Actions
  setSelectedHost: (hostUrl: string | null) => void;
  setSelectedContainer: (container: NormalizedContainer | null) => void;
  refreshContainers: (host: string) => Promise<void>;
  performAction: (
    hostUrl: string,
    containerId: string,
    action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove",
  ) => Promise<boolean>;
  checkHostsStatus: () => Promise<void>;

  // Host management
  refreshHosts: () => Promise<void>;
  syncHosts: () => Promise<{ count: number; onlineCount: number }>;
  checkHostStatus: (deviceId: string) => Promise<{ online: boolean }>;
  checkBulkHostStatus: (
    deviceIds: string[],
  ) => Promise<Array<{ deviceId: string; online: boolean; error?: string }>>;

  getContainer: (id: string) => NormalizedContainer | undefined;
  getContainers: (hostUrl: string) => NormalizedContainer[];

  // Unified WebSocket Subscriptions
  subscribeLogs: (
    containerId: string,
    callback: (logs: string) => void,
    hostUrl?: string,
  ) => () => void;
  subscribeTerminal: (
    containerId: string,
    callback: (output: string) => void,
    hostUrl?: string,
  ) => () => void;
  subscribeStats: (
    containerId: string,
    callback: (stats: ContainerStats) => void,
    hostUrl?: string,
  ) => () => void;

  // Terminal actions
  sendTerminalInput: (containerId: string, input: string) => void;
  sendTerminalResize: (containerId: string, rows: number, cols: number) => void;

  // Connection state
  getConnectionState: (containerId: string) => boolean;
}

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

export const DEFAULT_DOCKER_STATE: DockerState = {
  containers: new Map(),
  firstRun: false,
  selectedContainer: null,
  selectedHost: null,
  isLoading: false,
  error: null,
  loadState: "init",
  onlineHosts: [],
  hosts: [],
  setSelectedHost: () => {},
  setSelectedContainer: () => {},
  refreshContainers: async () => {},
  performAction: async () => false,
  checkHostsStatus: async () => {},
  refreshHosts: async () => {},
  syncHosts: async () => ({ count: 0, onlineCount: 0 }),
  checkHostStatus: async () => ({ online: false }),
  checkBulkHostStatus: async () => [],
  subscribeLogs: () => () => {},
  subscribeTerminal: () => () => {},
  subscribeStats: () => () => {},
  sendTerminalInput: () => {},
  sendTerminalResize: () => {},
  getConnectionState: () => false,
  getContainers: () => [],
  getContainer: () => undefined,
};

export const DockerContext = createContext(DEFAULT_DOCKER_STATE);

/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

export const useDocker = () => {
  return useContext(DockerContext);
};

const useDockerProvider = (): DockerState => {
  const [hosts, setHosts] = useState<RouterOutputs["docker"]["getHosts"]>([]);
  const [containers, setContainers] = useState<
    Map<string, NormalizedContainer[]>
  >(new Map());
  const [selectedContainer, setSelectedContainer] =
    useState<NormalizedContainer | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadState, setLoadState] = useState<DockerProviderLoadState>("init");
  const [error, setError] = useState<string | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  // const [onlineHosts, setOnlineHosts] = useState<string[]>([]);

  // WebSocket connections registry - keyed by containerId
  const connectionsRef = useRef<Map<string, WebSocketConnection>>(new Map());

  // tRPC hooks
  const utils = trpc.useUtils();
  const performActionMutation =
    trpc.docker.performContainerAction.useMutation();
  const fetchStatus = trpc.docker.checkHostStatus.useMutation();

  const { data: fetchedHosts } = trpc.docker.getHosts.useQuery(undefined, {
    enabled: true,
  });

  /* -------------------------------------------------------------------------- */
  /*                          WebSocket Connection Management                   */
  /* -------------------------------------------------------------------------- */

  const getOrCreateConnection = useCallback(
    (containerId: string, hostUrl: string): WebSocketConnection => {
      let connection = connectionsRef.current.get(containerId);

      if (connection) {
        return connection;
      }

      // Create new WebSocket connection
      console.log(
        `[DOCKER] Creating new WebSocket connection for ${containerId}`,
      );

      const wsUrl = `ws://localhost:3000/api/docker/ws/${containerId}?host=${encodeURIComponent(hostUrl)}`;
      const ws = new WebSocket(wsUrl);

      connection = {
        ws,
        containerId,
        hostUrl,
        subscribedTopics: new Set(),
        logsCallbacks: new Set(),
        statsCallbacks: new Set(),
        terminalCallbacks: new Set(),
        logsData: "",
        terminalData: "",
        isConnected: false,
        reconnectAttempts: 0,
      };

      ws.onopen = () => {
        console.log(`[DOCKER] WebSocket connected for ${containerId}`);
        if (connection) {
          connection.isConnected = true;
          connection.reconnectAttempts = 0;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);

          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" } as ClientMessage));
            return;
          }

          if (message.type === "connected") {
            console.log(`[DOCKER] Connection established:`, message);
            return;
          }

          if (message.type === "logs" && connection) {
            connection.logsData += message.data;
            connection.logsCallbacks.forEach((cb) => cb(connection!.logsData));
          }

          if (message.type === "stats" && connection) {
            connection.statsCallbacks.forEach((cb) => cb(message.data));
          }

          if (message.type === "terminal_output" && connection) {
            connection.terminalData += message.data;
            connection.terminalCallbacks.forEach((cb) =>
              cb(connection!.terminalData),
            );
          }

          if (message.type === "subscribed") {
            console.log(
              `[DOCKER] Subscribed to ${message.topic} for ${containerId}`,
            );
          }

          if (message.type === "unsubscribed") {
            console.log(
              `[DOCKER] Unsubscribed from ${message.topic} for ${containerId}`,
            );
          }

          if (message.type === "error") {
            console.error(
              `[DOCKER] Error on topic ${message.topic}:`,
              message.error,
            );
          }

          if (message.type === "terminal_end") {
            console.log(`[DOCKER] Terminal ended for ${containerId}`);
          }
        } catch (err) {
          console.error("[DOCKER] Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error(`[DOCKER] WebSocket error for ${containerId}:`, error);
        if (connection) {
          connection.isConnected = false;
        }
      };

      ws.onclose = () => {
        console.log(`[DOCKER] WebSocket closed for ${containerId}`);
        if (connection) {
          connection.isConnected = false;
          connection.subscribedTopics.clear();
        }
        connectionsRef.current.delete(containerId);
      };

      connectionsRef.current.set(containerId, connection);
      return connection;
    },
    [connectionsRef.current],
  );

  const subscribeToTopic = useCallback(
    (
      containerId: string,
      topic: ChannelType,
      hostUrl: string,
      options?: ClientMessage["options"],
    ) => {
      const connection = getOrCreateConnection(containerId, hostUrl);

      if (!connection.subscribedTopics.has(topic)) {
        console.log(`[DOCKER] Subscribing to ${topic} for ${containerId}`);

        const message: ClientMessage = {
          type: "subscribe",
          topic,
          options,
        };

        // Wait for connection to be ready
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(message));
          connection.subscribedTopics.add(topic);
        } else {
          connection.ws.addEventListener(
            "open",
            () => {
              connection.ws.send(JSON.stringify(message));
              connection.subscribedTopics.add(topic);
            },
            { once: true },
          );
        }
      }
    },
    [getOrCreateConnection],
  );

  const unsubscribeFromTopic = useCallback(
    (containerId: string, topic: ChannelType) => {
      const connection = connectionsRef.current.get(containerId);
      if (!connection) return;

      // Check if there are still callbacks for this topic
      const hasCallbacks =
        (topic === "logs" && connection.logsCallbacks.size > 0) ||
        (topic === "stats" && connection.statsCallbacks.size > 0) ||
        (topic === "terminal" && connection.terminalCallbacks.size > 0);

      if (!hasCallbacks && connection.subscribedTopics.has(topic)) {
        console.log(`[DOCKER] Unsubscribing from ${topic} for ${containerId}`);

        const message: ClientMessage = {
          type: "unsubscribe",
          topic,
        };

        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(message));
        }

        connection.subscribedTopics.delete(topic);

        // If no more subscriptions, close the WebSocket
        if (connection.subscribedTopics.size === 0) {
          console.log(
            `[DOCKER] No more subscriptions, closing WebSocket for ${containerId}`,
          );
          connection.ws.close();
          connectionsRef.current.delete(containerId);
        }
      }
    },
    [],
  );

  /* -------------------------------------------------------------------------- */
  /*                          Subscription Methods                              */
  /* -------------------------------------------------------------------------- */

  const subscribeLogs = useCallback(
    (
      containerId: string,
      callback: (logs: string) => void,
      hostUrl?: string,
    ): (() => void) => {
      const effectiveHost = hostUrl || selectedHost;

      if (!effectiveHost) {
        console.warn("[DOCKER] No host URL provided for logs");
        return () => {};
      }

      const connection = getOrCreateConnection(containerId, effectiveHost);
      connection.logsCallbacks.add(callback);

      // Send accumulated data to new subscriber
      if (connection.logsData) {
        callback(connection.logsData);
      }

      // Subscribe to topic if not already subscribed
      subscribeToTopic(containerId, "logs", effectiveHost, {
        follow: true,
        tail: 100,
        timestamps: true,
      });

      // Return unsubscribe function
      return () => {
        const conn = connectionsRef.current.get(containerId);
        if (conn) {
          conn.logsCallbacks.delete(callback);
          unsubscribeFromTopic(containerId, "logs");
        }
      };
    },
    [
      selectedHost,
      getOrCreateConnection,
      subscribeToTopic,
      unsubscribeFromTopic,
    ],
  );

  const subscribeStats = useCallback(
    (
      containerId: string,
      callback: (stats: ContainerStats) => void,
      hostUrl?: string,
    ): (() => void) => {
      const effectiveHost = hostUrl || selectedHost;

      if (!effectiveHost) {
        console.warn("[DOCKER] No host URL provided for stats");
        return () => {};
      }

      const connection = getOrCreateConnection(containerId, effectiveHost);
      connection.statsCallbacks.add(callback);

      // Subscribe to topic if not already subscribed
      subscribeToTopic(containerId, "stats", effectiveHost);

      // Return unsubscribe function
      return () => {
        const conn = connectionsRef.current.get(containerId);
        if (conn) {
          conn.statsCallbacks.delete(callback);
          unsubscribeFromTopic(containerId, "stats");
        }
      };
    },
    [
      selectedHost,
      getOrCreateConnection,
      subscribeToTopic,
      unsubscribeFromTopic,
    ],
  );

  const subscribeTerminal = useCallback(
    (
      containerId: string,
      callback: (output: string) => void,
      hostUrl?: string,
    ): (() => void) => {
      const effectiveHost = hostUrl || selectedHost;

      if (!effectiveHost) {
        console.warn("[DOCKER] No host URL provided for terminal");
        return () => {};
      }

      const connection = getOrCreateConnection(containerId, effectiveHost);
      connection.terminalCallbacks.add(callback);

      // Send accumulated data to new subscriber
      if (connection.terminalData) {
        callback(connection.terminalData);
      }

      // Subscribe to topic if not already subscribed
      subscribeToTopic(containerId, "terminal", effectiveHost);

      // Return unsubscribe function
      return () => {
        const conn = connectionsRef.current.get(containerId);
        if (conn) {
          conn.terminalCallbacks.delete(callback);
          // Note: Don't unsubscribe from terminal automatically
          // Terminal should stay active until explicitly closed
        }
      };
    },
    [selectedHost, getOrCreateConnection, subscribeToTopic],
  );

  /* -------------------------------------------------------------------------- */
  /*                          Terminal Actions                                  */
  /* -------------------------------------------------------------------------- */

  const sendTerminalInput = useCallback(
    (containerId: string, input: string) => {
      const connection = connectionsRef.current.get(containerId);
      if (connection?.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(
          JSON.stringify({
            type: "terminal_input",
            data: input,
          } as ClientMessage),
        );
      } else {
        console.warn("[DOCKER] Terminal WebSocket not connected");
      }
    },
    [],
  );

  const sendTerminalResize = useCallback(
    (containerId: string, rows: number, cols: number) => {
      const connection = connectionsRef.current.get(containerId);
      if (connection?.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(
          JSON.stringify({
            type: "terminal_resize",
            rows,
            cols,
          } as ClientMessage),
        );
      } else {
        console.warn("[DOCKER] Terminal WebSocket not connected for resize");
      }
    },
    [],
  );

  /* -------------------------------------------------------------------------- */
  /*                          Container Actions                                 */
  /* -------------------------------------------------------------------------- */
  const getContainer = (containerId: string) => {
    let container: NormalizedContainer | undefined;
    containers.forEach((hostContainers) => {
      const f = hostContainers.find((c) => c.id === containerId);
      if (f) container = f;
    });
    return container;
  };

  const getContainers = useCallback(
    (hostUrl: string) => {
      const cached = containers.get(hostUrl);
      if (!cached) refreshContainers(hostUrl);
      return cached ?? [];
    },
    [hosts, containers.size],
  );

  const refreshContainers = useCallback(
    async (hostUrl: string) => {
      if (!hostUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await utils.docker.getContainers.fetch({
          hostUrl: hostUrl,
        });
        containers.set(hostUrl, result);
        setContainers(containers);
      } catch (err) {
        console.error("[DOCKER] Error fetching containers:", err);
        setError("Failed to fetch containers");
        // setContainers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [utils],
  );

  const performAction = useCallback(
    async (
      hostUrl: string,
      containerId: string,
      action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove",
    ): Promise<boolean> => {
      if (!hostUrl) return false;

      try {
        await performActionMutation.mutateAsync({
          hostUrl,
          containerId,
          action,
        });

        // Refresh containers after action
        await refreshContainers(hostUrl);
        return true;
      } catch (err) {
        console.error(`[DOCKER] Error performing action ${action}:`, err);
        setError(`Failed to ${action} container`);
        return false;
      }
    },
    [performActionMutation, refreshContainers],
  );

  const checkHostsStatus = useCallback(async () => {
    try {
      console.log("[DOCKER] Checking hosts status...");
      console.log(hosts);
      const online = hosts
        .filter((h) => h.status === "Online")
        .map((h) => h.tunnelUrl);
      console.log(hosts.filter((h) => h.status === "Online"));

      // setOnlineHosts(online);
      console.log("[DOCKER] Online hosts:", online);
    } catch (err) {
      console.error("[DOCKER] Error checking hosts status:", err);
    }
  }, [hosts]);

  const getConnectionState = useCallback((containerId: string): boolean => {
    const connection = connectionsRef.current.get(containerId);
    return connection?.isConnected || false;
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                          Host Management Methods                           */
  /* -------------------------------------------------------------------------- */

  const refreshHosts = useCallback(async () => {
    try {
      await utils.docker.getHosts.invalidate();
    } catch (err) {
      console.error("[DOCKER] Error refreshing hosts:", err);
    }
  }, [utils]);

  const syncHosts = useCallback(async () => {
    try {
      const result = await utils.client.docker.syncHosts.mutate();
      await refreshHosts();
      return result;
    } catch (err) {
      console.error("[DOCKER] Error syncing hosts:", err);
      throw err;
    }
  }, [utils, refreshHosts]);

  const checkHostStatus = useCallback(
    async (deviceId: string) => {
      try {
        const result = await utils.client.docker.checkHostStatus.mutate({
          deviceId,
        });
        await refreshHosts();
        return result;
      } catch (err) {
        console.error("[DOCKER] Error checking host status:", err);
        throw err;
      }
    },
    [utils, refreshHosts],
  );

  const checkBulkHostStatus = useCallback(
    async (deviceIds: string[]) => {
      try {
        const result = await utils.client.docker.checkBulkHostStatus.mutate({
          deviceIds,
        });
        await refreshHosts();
        return result;
      } catch (err) {
        console.error("[DOCKER] Error checking bulk host status:", err);
        throw err;
      }
    },
    [utils, refreshHosts],
  );

  /* -------------------------------------------------------------------------- */
  /*                          Effects                                           */
  /* -------------------------------------------------------------------------- */

  // Check hosts status on mount
  useEffect(() => {
    checkHostsStatus();
    (async () => {
      for (const host of hosts) {
        setLoadState("containers");
        await refreshContainers(host.metadata.ipv4);
        setLoadState("ready");
        setFirstRun(true);
      }
    })();
  }, [hosts, checkHostsStatus]);

  useEffect(() => {
    async function assignHosts() {
      setLoadState("host");
      if (fetchedHosts) {
        await Promise.all(
          fetchedHosts.map(async (host) => {
            const status = await fetchStatus.mutateAsync({
              deviceId: host.id,
            });
            host.status = status.online ? "Online" : "Offline";
          }),
        );
        setHosts(fetchedHosts);
      }
    }
    assignHosts();
  }, [fetchedHosts]);

  const onlineHosts = useMemo(() => {
    return hosts.filter((h) => h.status === "Online");
  }, [hosts]);

  useEffect(() => {
    const ref = connectionsRef.current;
    return () => {
      ref.forEach((connection) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close();
        }
      });
      ref.clear();
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                          Return State                                      */
  /* -------------------------------------------------------------------------- */

  const value = useMemo<DockerState>(
    () => ({
      firstRun,
      containers,
      selectedContainer,
      selectedHost,
      isLoading,
      error,
      onlineHosts,
      hosts,
      setSelectedHost,
      setSelectedContainer,
      refreshContainers,
      performAction,
      checkHostsStatus,
      refreshHosts,
      syncHosts,
      checkHostStatus,
      checkBulkHostStatus,
      subscribeLogs,
      subscribeTerminal,
      subscribeStats,
      sendTerminalInput,
      sendTerminalResize,
      getConnectionState,
      getContainers,
      getContainer,
      loadState,
    }),
    [
      containers,
      firstRun,
      selectedContainer,
      selectedHost,
      isLoading,
      error,
      onlineHosts,
      hosts,
      refreshContainers,
      performAction,
      checkHostsStatus,
      refreshHosts,
      syncHosts,
      checkHostStatus,
      checkBulkHostStatus,
      subscribeLogs,
      subscribeTerminal,
      subscribeStats,
      sendTerminalInput,
      sendTerminalResize,
      getConnectionState,
      getContainers,
      getContainer,
    ],
  );

  return value;
};

/* -------------------------------------------------------------------------- */
/*                                  PROVIDER                                  */
/* -------------------------------------------------------------------------- */

export const DockerProvider: React.FC<Props> = ({ children }) => {
  const value = useDockerProvider();
  return (
    <DockerContext.Provider value={value}>{children}</DockerContext.Provider>
  );
};

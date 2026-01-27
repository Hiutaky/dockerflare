# API Reference

Dockerflare uses **tRPC** (TypeScript Remote Procedure Call) for type-safe API communication between frontend and backend. All API calls are defined in the `dockerRouter` and are accessible through the `/api/trpc` endpoint.

## 📋 API Overview

### Base URL

```
/api/trpc
```

### Request Format

```typescript
// Client-side usage
import { trpc } from "@/lib/trpc-client";

// Query example
const hosts = await trpc.docker.getHosts.query();

// Mutation example
await trpc.docker.startContainer.mutate({
  hostUrl: "http://localhost:2376",
  containerId: "abc123",
});
```

### Response Format

All responses include full TypeScript type information for type-safe consumption.

## 🔧 Host Management Endpoints

### `getHosts`

**Purpose:** Retrieve all registered Docker hosts with metadata

**Route:** `docker.getHosts`
**Method:** Query
**Authentication:** None (public procedure)

**Response:**

```typescript
type HostResponse = {
  id: string; // Cloudflare device ID
  name: string; // Device name
  tunnelUrl: string; // IPv4 tunnel URL
  status: "Online" | "Offline";
  lastSeen?: Date; // Last seen timestamp
  containerCount: number; // Total containers
  runningContainers: number; // Running containers
}[];
```

**Behavior:**

- Fetches devices from Cloudflare WARP API
- Enhances with container counts from Docker API
- Updates in-memory host store with current status
- Returns comprehensive host information

### `syncHosts`

**Purpose:** Synchronize host status with current reality

**Route:** `docker.syncHosts`
**Method:** Mutation
**Authentication:** None

**Response:**

```typescript
type SyncResponse = {
  count: number; // Total hosts found
  onlineCount: number; // Hosts that are currently online
};
```

**Behavior:**

- Checks health of all Cloudflare WARP devices
- Updates in-memory host store
- Useful after network changes or host additions

### `checkHostStatus`

**Purpose:** Check status of a specific host

**Route:** `docker.checkHostStatus`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  deviceId: string; // Cloudflare device ID
}
```

**Response:**

```typescript
type StatusResponse = {
  online: boolean; // Current online status
};
```

### `checkBulkHostStatus`

**Purpose:** Check status of multiple hosts simultaneously

**Route:** `docker.checkBulkHostStatus`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  deviceIds: string[]  // Array of Cloudflare device IDs
}
```

**Response:**

```typescript
type BulkStatusResponse = {
  deviceId: string;
  online: boolean;
  error?: string; // Only present if device not found
}[];
```

### `pingAllHosts`

**Purpose:** Refresh status for all registered hosts

**Route:** `docker.pingAllHosts`
**Method:** Mutation
**Authentication:** None

**Response:**

```typescript
type PingResponse = {
  totalHosts: number;
  updatedCount: number; // Number of hosts that are online
};
```

## 📦 Container Management Endpoints

### `getContainers`

**Purpose:** Retrieve all containers from a specific host

**Route:** `docker.getContainers`
**Method:** Query
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string; // Docker host URL (e.g., 'http://192.168.1.100:2376')
}
```

**Response:**

```typescript
type ContainerResponse = {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: "running" | "exited" | "paused" | "restarting" | "dead";
  Status: string;
  Ports: {
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }[];
  Labels?: Record<string, string>;
  SizeRw?: number;
  SizeRootFs?: number;
  HostConfig: object;
  NetworkSettings: object;
  Mounts: object[];
}[];
```

**Behavior:**

- Lists all containers (including stopped) from specified host
- Maps directly to Docker API `/containers/json?all=true`

### `performContainerAction`

**Purpose:** Execute an action on a specific container

**Route:** `docker.performContainerAction`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  containerId: string;
  action: "start" | "stop" | "restart" | "pause" | "unpause" | "remove";
}
```

**Response:**

```typescript
type ActionResponse = boolean; // Always true on success
```

**Available Actions:**

- `start`: Start a stopped container
- `stop`: Stop a running container (graceful shutdown)
- `restart`: Restart a container
- `pause`: Pause a running container
- `unpause`: Unpause a paused container
- `remove`: Remove a stopped container

### `inspectContainer`

**Purpose:** Get detailed information about a container

**Route:** `docker.inspectContainer`
**Method:** Query
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  containerId: string;
}
```

**Response:**

```typescript
type InspectResponse = {
  Id: string;
  Created: string;
  Path: string;
  Args: string[];
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
    Health?: object;
  };
  Image: string;
  ResolvConfPath: string;
  HostnamePath: string;
  HostsPath: string;
  LogPath: string;
  Name: string;
  RestartCount: number;
  Driver: string;
  Platform: string;
  MountLabel: string;
  ProcessLabel: string;
  AppArmorProfile: string;
  HostConfig: object;
  GraphDriver: object;
  SizeRw?: number;
  SizeRootFs?: number;
  Image: string;
  Volumes: object;
  WorkingDir: string;
  Entrypoint?: string[];
  NetworkSettings: object;
  // ... full Docker inspect response
};
```

## 🚀 Deployment Endpoints

### `createAndRunContainer`

**Purpose:** Create and start a container with full configuration

**Route:** `docker.createAndRunContainer`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  config: {
    name?: string;
    image: string;
    cmd?: string[];
    entrypoint?: string[];
    workingDir?: string;
    env?: string[];
    labels?: Record<string, string>;
    exposedPorts?: Record<string, any>;
    hostConfig?: {
      portBindings?: Record<string, { HostPort: string }[]>;
      binds?: string[];
      memory?: number;
      memoryReservation?: number;
      cpuShares?: number;
      cpuQuota?: number;
      cpuPeriod?: number;
      restartPolicy?: {
        name: 'no' | 'always' | 'on-failure' | 'unless-stopped';
        maximumRetryCount?: number;
      };
      networkMode?: string;
      privileged?: boolean;
      capAdd?: string[];
      capDrop?: string[];
    };
    networkingConfig?: {
      endpointsConfig?: Record<string, any>;
    };
  }
}
```

**Response:**

```typescript
type CreateResponse = {
  success: boolean;
  message: string; // Status message for WebSocket progress updates
};
```

**Note:** Actual container creation happens via WebSocket for real-time progress updates.

### `deployComposeStack`

**Purpose:** Deploy a Docker Compose stack

**Route:** `docker.deployComposeStack`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  composeConfig: {
    projectName: string;
    services: Record<string, {
      image: string;
      container_name?: string;
      ports?: string[];
      environment?: Record<string, string>;
      volumes?: string[];
      networks?: string[];
      restart?: string;
      depends_on?: string[];
    }>;
    networks?: Record<string, {
      driver?: string;
    }>;
    volumes?: Record<string, {
      driver?: string;
    }>;
  }
}
```

**Response:**

```typescript
type ComposeResponse = {
  success: boolean;
  message: string; // Status message for WebSocket progress updates
};
```

## 📊 Monitoring Endpoints

### `getContainerLogs`

**Purpose:** Retrieve container logs (streaming via WebSocket)

**Route:** `docker.getContainerLogs`
**Method:** Query
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  containerId: string;
  tail?: number;     // Number of lines to retrieve (default: 100)
  follow?: boolean;  // Stream logs continuously (default: false)
}
```

**Response:**

```typescript
type LogsResponse = {
  logs: string; // Log output as string
  tail: number; // Tail parameter used
};
```

**Note:** Live log streaming should be handled via WebSocket connections.

### `getContainerStats`

**Purpose:** Get real-time container resource usage

**Route:** `docker.getContainerStats`
**Method:** Query
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  containerId: string;
}
```

**Response:**

```typescript
type StatsResponse = {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  network_rx: number;
  network_tx: number;
  block_read: number;
  block_write: number;
};
```

**Note:** Real-time stats streaming should be handled via WebSocket connections.

### `getAggregateStats`

**Purpose:** Get aggregate statistics across all hosts

**Route:** `docker.getAggregateStats`
**Method:** Query
**Authentication:** None

**Response:**

```typescript
type AggregateStatsResponse = {
  totalContainers: number;
  runningContainers: number;
  stoppedContainers: number;
  pausedContainers: number;
  totalHosts: number;
  onlineHosts: number;
};
```

## 🖥️ Terminal & Execution

### `execInContainer`

**Purpose:** Execute commands in a running container

**Route:** `docker.execInContainer`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  hostUrl: string;
  containerId: string;
  command: string;
}
```

**Response:**

```typescript
type ExecResponse = {
  success: boolean;
  output: string; // Command output
};
```

**Note:** Interactive terminal sessions are handled via WebSocket connections with xterm.js.

## 📋 Audit & Activity Endpoints

### `getRecentActivity`

**Purpose:** Retrieve recent user activity from audit logs

**Route:** `docker.getRecentActivity`
**Method:** Query
**Authentication:** None

**Input:**

```typescript
{
  limit?: number;  // Default: 10, Max: 100
}
```

**Response:**

```typescript
type ActivityResponse = {
  id: string;
  action: string;
  deviceId?: string;
  containerId?: string;
  timestamp: Date;
  user: {
    name?: string;
    email: string;
  };
}[];
```

### `logActivity`

**Purpose:** Record a user action in the audit log

**Route:** `docker.logActivity`
**Method:** Mutation
**Authentication:** None

**Input:**

```typescript
{
  userId: string;
  action: string;          // Action description
  deviceId?: string;       // Cloudflare device ID
  containerId?: string;    // Container ID
  details?: string;        // JSON string with additional data
}
```

**Response:**

```typescript
type LogResponse = {
  id: string; // Audit log entry ID
  userId: string;
  action: string;
  deviceId?: string;
  containerId?: string;
  details?: string;
  timestamp: Date;
};
```

## 🔄 Error Handling

### Common Error Scenarios

- **Host Unreachable**: Docker daemon not accessible

  ```json
  {
    "error": {
      "code": -32603,
      "message": "Host unreachable",
      "data": { "hostUrl": "http://localhost:2376" }
    }
  }
  ```

- **Container Not Found**: Invalid container ID

  ```json
  {
    "error": {
      "code": -32603,
      "message": "Container not found",
      "data": { "containerId": "abc123" }
    }
  }
  ```

- **Permission Denied**: Insufficient Docker permissions

  ```json
  {
    "error": {
      "code": -32603,
      "message": "Permission denied",
      "data": { "action": "start" }
    }
  }
  ```

- **Invalid Input**: Schema validation failed
  ```json
  {
    "error": {
      "code": -32602,
      "message": "Invalid input",
      "data": {
        "field": "hostUrl",
        "expected": "string",
        "received": "number"
      }
    }
  }
  ```

## 🛠️ Development Tips

### Type Safety

All API endpoints are fully type-safe. Import types from tRPC router:

```typescript
import type { RouterOutputs } from "@/lib/routers";

// Type-safe response
type Hosts = RouterOutputs["docker"]["getHosts"];
```

### React Integration

Use TanStack Query for caching and optimistic updates:

```typescript
const { data: hosts, refetch } = useQuery({
  queryKey: ["hosts"],
  queryFn: () => trpc.docker.getHosts.query(),
  refetchInterval: 30000, // Auto-refresh
});
```

### Real-Time Updates

For real-time features, combine tRPC with WebSockets:

```typescript
// tRPC for initial data
const containers = await trpc.docker.getContainers.query({ hostUrl });

// WebSocket for live updates (logs, stats, etc.)
// Implementation depends on your WebSocket setup
```

This API reference covers all current endpoints. Check the tRPC router source code for the most up-to-date implementation details.

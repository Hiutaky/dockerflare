/**
 * Deployment Templates for Common Use Cases
 */

export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "web" | "database" | "cache" | "monitoring" | "other";
  config: {
    cmd?: string[];
    image: string;
    name?: string;
    env?: Array<{ key: string; value: string; description?: string }>;
    ports?: Array<{ host: string; container: string; description?: string }>;
    volumes?: Array<{ host: string; container: string; description?: string }>;
    memory?: number;
    cpuShares?: number;
    restartPolicy?: "no" | "always" | "on-failure" | "unless-stopped";
  };
}

export interface ComposeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "stack" | "development" | "production";
  services: Record<string, object>;
  networks?: Record<string, object>;
  volumes?: Record<string, object>;
}

export const containerTemplates: DeploymentTemplate[] = [
  {
    id: "cloudflared",
    name: "Cloudflared Tunnel",
    category: "web",
    config: {
      cmd: ["tunnel", "--protocol=http2 --no-autoupdate run"],
      image: "cloudflare/cloudflared",
      env: [
        {
          key: "TUNNEL_TOKEN",
          value: "YOUR_ACCESS_TOKEN",
          description: "Access token needed to authenticate the tunnel",
        },
      ],
      restartPolicy: "always",
    },
    description: "Create secure public Tunnels using cloudflared.",
    icon: "☁️",
  },
  {
    id: "nginx",
    name: "Nginx Web Server",
    description: "Lightweight, high-performance HTTP server and reverse proxy",
    icon: "🌐",
    category: "web",
    config: {
      image: "nginx:alpine",
      name: "nginx-web",
      ports: [
        { host: "80", container: "80", description: "HTTP Port" },
        { host: "443", container: "443", description: "HTTPS Port" },
      ],
      volumes: [
        {
          host: "/data/nginx/html",
          container: "/usr/share/nginx/html",
          description: "Web content",
        },
        {
          host: "/data/nginx/conf",
          container: "/etc/nginx/conf.d",
          description: "Nginx configuration",
        },
      ],
      memory: 512 * 1024 * 1024, // 512MB
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "postgres",
    name: "PostgreSQL Database",
    description: "Powerful, open-source relational database",
    icon: "🐘",
    category: "database",
    config: {
      image: "postgres:16-alpine",
      name: "postgres-db",
      env: [
        { key: "POSTGRES_USER", value: "admin", description: "Database user" },
        {
          key: "POSTGRES_PASSWORD",
          value: "changeme",
          description: "Database password",
        },
        {
          key: "POSTGRES_DB",
          value: "myapp",
          description: "Default database name",
        },
        {
          key: "PGDATA",
          value: "/var/lib/postgresql/data/pgdata",
          description: "Data directory",
        },
      ],
      ports: [
        { host: "5432", container: "5432", description: "PostgreSQL Port" },
      ],
      volumes: [
        {
          host: "/data/postgres",
          container: "/var/lib/postgresql/data",
          description: "Database data",
        },
      ],
      memory: 1024 * 1024 * 1024, // 1GB
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "redis",
    name: "Redis Cache",
    description: "In-memory data structure store, cache, and message broker",
    icon: "⚡",
    category: "cache",
    config: {
      image: "redis:alpine",
      name: "redis-cache",
      ports: [{ host: "6379", container: "6379", description: "Redis Port" }],
      volumes: [
        { host: "/data/redis", container: "/data", description: "Redis data" },
      ],
      memory: 512 * 1024 * 1024, // 512MB
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "node",
    name: "Node.js Application",
    description: "JavaScript runtime built on Chrome's V8 engine",
    icon: "💚",
    category: "web",
    config: {
      image: "node:20-alpine",
      name: "node-app",
      env: [
        {
          key: "NODE_ENV",
          value: "production",
          description: "Node environment",
        },
        { key: "PORT", value: "3000", description: "Application port" },
      ],
      ports: [
        { host: "3000", container: "3000", description: "Application Port" },
      ],
      volumes: [
        {
          host: "/data/app",
          container: "/usr/src/app",
          description: "Application code",
        },
      ],
      memory: 512 * 1024 * 1024, // 512MB
      cpuShares: 1024,
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "mysql",
    name: "MySQL Database",
    description: "Popular open-source relational database",
    icon: "🐬",
    category: "database",
    config: {
      image: "mysql:8",
      name: "mysql-db",
      env: [
        {
          key: "MYSQL_ROOT_PASSWORD",
          value: "changeme",
          description: "Root password",
        },
        {
          key: "MYSQL_DATABASE",
          value: "myapp",
          description: "Default database",
        },
        { key: "MYSQL_USER", value: "admin", description: "Database user" },
        {
          key: "MYSQL_PASSWORD",
          value: "changeme",
          description: "User password",
        },
      ],
      ports: [{ host: "3306", container: "3306", description: "MySQL Port" }],
      volumes: [
        {
          host: "/data/mysql",
          container: "/var/lib/mysql",
          description: "Database data",
        },
      ],
      memory: 1024 * 1024 * 1024, // 1GB
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Popular NoSQL document database",
    icon: "🍃",
    category: "database",
    config: {
      image: "mongo:7",
      name: "mongodb",
      env: [
        {
          key: "MONGO_INITDB_ROOT_USERNAME",
          value: "admin",
          description: "Root username",
        },
        {
          key: "MONGO_INITDB_ROOT_PASSWORD",
          value: "changeme",
          description: "Root password",
        },
      ],
      ports: [
        { host: "27017", container: "27017", description: "MongoDB Port" },
      ],
      volumes: [
        {
          host: "/data/mongodb",
          container: "/data/db",
          description: "Database data",
        },
      ],
      memory: 1024 * 1024 * 1024, // 1GB
      restartPolicy: "unless-stopped",
    },
  },
  {
    id: "traefik",
    name: "Traefik Proxy",
    description: "Modern HTTP reverse proxy and load balancer",
    icon: "🔀",
    category: "web",
    config: {
      image: "traefik:v3.0",
      name: "traefik",
      ports: [
        { host: "80", container: "80", description: "HTTP" },
        { host: "443", container: "443", description: "HTTPS" },
        { host: "8080", container: "8080", description: "Dashboard" },
      ],
      volumes: [
        {
          host: "/var/run/docker.sock",
          container: "/var/run/docker.sock",
          description: "Docker socket",
        },
        {
          host: "/data/traefik",
          container: "/etc/traefik",
          description: "Configuration",
        },
      ],
      memory: 256 * 1024 * 1024, // 256MB
      restartPolicy: "unless-stopped",
    },
  },
];

export const composeTemplates: ComposeTemplate[] = [
  {
    id: "wordpress",
    name: "WordPress + MySQL",
    description: "Complete WordPress stack with MySQL database",
    icon: "📝",
    category: "stack",
    services: {
      wordpress: {
        image: "wordpress:latest",
        container_name: "wordpress",
        ports: ["80:80"],
        environment: {
          WORDPRESS_DB_HOST: "mysql:3306",
          WORDPRESS_DB_USER: "wordpress",
          WORDPRESS_DB_PASSWORD: "changeme",
          WORDPRESS_DB_NAME: "wordpress",
        },
        volumes: ["/data/wordpress:/var/www/html"],
        networks: ["wordpress-net"],
        restart: "unless-stopped",
        depends_on: ["mysql"],
      },
      mysql: {
        image: "mysql:8",
        container_name: "wordpress-mysql",
        environment: {
          MYSQL_ROOT_PASSWORD: "rootchangeme",
          MYSQL_DATABASE: "wordpress",
          MYSQL_USER: "wordpress",
          MYSQL_PASSWORD: "changeme",
        },
        volumes: ["/data/wordpress-mysql:/var/lib/mysql"],
        networks: ["wordpress-net"],
        restart: "unless-stopped",
      },
    },
    networks: {
      "wordpress-net": {
        driver: "bridge",
      },
    },
  },
  {
    id: "mern-stack",
    name: "MERN Stack",
    description: "MongoDB, Express, React, Node.js development stack",
    icon: "⚛️",
    category: "development",
    services: {
      mongodb: {
        image: "mongo:7",
        container_name: "mern-mongodb",
        ports: ["27017:27017"],
        environment: {
          MONGO_INITDB_ROOT_USERNAME: "admin",
          MONGO_INITDB_ROOT_PASSWORD: "changeme",
        },
        volumes: ["/data/mern-mongodb:/data/db"],
        networks: ["mern-net"],
        restart: "unless-stopped",
      },
      backend: {
        image: "node:20-alpine",
        container_name: "mern-backend",
        ports: ["5000:5000"],
        environment: {
          NODE_ENV: "development",
          MONGODB_URI:
            "mongodb://admin:changeme@mongodb:27017/mernapp?authSource=admin",
        },
        volumes: ["/data/mern-backend:/usr/src/app"],
        networks: ["mern-net"],
        restart: "unless-stopped",
        depends_on: ["mongodb"],
      },
      frontend: {
        image: "node:20-alpine",
        container_name: "mern-frontend",
        ports: ["3000:3000"],
        environment: {
          REACT_APP_API_URL: "http://localhost:5000",
        },
        volumes: ["/data/mern-frontend:/usr/src/app"],
        networks: ["mern-net"],
        restart: "unless-stopped",
      },
    },
    networks: {
      "mern-net": {
        driver: "bridge",
      },
    },
  },
  {
    id: "monitoring",
    name: "Monitoring Stack",
    description: "Prometheus + Grafana monitoring solution",
    icon: "📊",
    category: "production",
    services: {
      prometheus: {
        image: "prom/prometheus:latest",
        container_name: "prometheus",
        ports: ["9090:9090"],
        volumes: [
          "/data/prometheus/config:/etc/prometheus",
          "/data/prometheus/data:/prometheus",
        ],
        networks: ["monitoring-net"],
        restart: "unless-stopped",
      },
      grafana: {
        image: "grafana/grafana:latest",
        container_name: "grafana",
        ports: ["3000:3000"],
        environment: {
          GF_SECURITY_ADMIN_PASSWORD: "changeme",
        },
        volumes: ["/data/grafana:/var/lib/grafana"],
        networks: ["monitoring-net"],
        restart: "unless-stopped",
        depends_on: ["prometheus"],
      },
    },
    networks: {
      "monitoring-net": {
        driver: "bridge",
      },
    },
  },
];

export function getTemplateById(id: string): DeploymentTemplate | undefined {
  return containerTemplates.find((t) => t.id === id);
}

export function getComposeTemplateById(
  id: string,
): ComposeTemplate | undefined {
  return composeTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): DeploymentTemplate[] {
  return containerTemplates.filter((t) => t.category === category);
}

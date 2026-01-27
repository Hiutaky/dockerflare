# Setup & Installation

This guide will walk you through setting up Dockerflare for development and deployment.

## 🚀 Quick Start

### Prerequisites

Before installing Dockerflare, ensure you have:

- **Node.js**: Version 18+ (LTS recommended)
- **Bun**: Latest version (for optimal performance)
- **Docker**: Latest stable version with Docker Engine API enabled
- **Cloudflare WARP**: Installed and configured on Docker hosts

### One-Command Setup

```bash
# Clone and install
git clone https://github.com/Hiutaky/localflare.git
cd localflare
bun install

# Set up development environment
cd packages/application
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to access Dockerflare.

## 📋 Detailed Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/Hiutaky/localflare.git
cd localflare

# Install dependencies
bun install
```

### 2. Application Setup

```bash
# Navigate to the main application
cd packages/application

# Install dependencies
bun install

# Set up the database
bunx prisma generate
bunx prisma migrate dev --name init
```

### 3. Environment Configuration

Create environment files as needed:

```bash
# .env.local in packages/application/
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"

# Add any additional environment variables your deployment requires
```

### 4. Docker Host Configuration

#### Enable Docker Engine API

**On Linux:**

```bash
# Edit Docker daemon configuration
sudo nano /etc/docker/daemon.json

# Add the following configuration:
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tls": false
}

# Restart Docker service
sudo systemctl restart docker
```

**On macOS/Windows:**
Use Docker Desktop settings to enable the Docker Engine API on a specific port.

#### Cloudflare WARP Setup

1. Install Cloudflare WARP on your Docker host:

   ```bash
   # Linux
   curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ jammy main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
   sudo apt update && sudo apt install cloudflare-warp

   # macOS (using brew)
   brew install --cask cloudflare-warp

   # Windows: Download from https://one.one.one.one/
   ```

2. Authenticate with Cloudflare Zero Trust:

   ```bash
   warp-cli registration new <your-token>
   ```

3. Enable Always-On mode:
   ```bash
   warp-cli mode always-on
   ```

### 5. Firewall Configuration

Ensure Docker Engine API port is accessible:

```bash
# Linux (ufw example)
sudo ufw allow 2376/tcp

# Or configure for specific IP ranges only
sudo ufw allow from 192.168.1.0/24 to any port 2376 proto tcp
```

## 🔧 Development Commands

### Running the Application

```bash
# Start development server
bun run dev

# Start with debugging
bun run dev --inspect

# Production mode
NODE_ENV=production bun run start
```

### Database Management

```bash
# Generate Prisma client
bunx prisma generate

# Create and run migrations
bunx prisma migrate dev

# View database in browser
bunx prisma studio

# Reset database (development only)
bunx prisma migrate reset
```

### Code Quality

```bash
# Lint code
bun run lint

# Type check
bunx tsc --noEmit

# Format code
bunx prettier --write .
```

## 🌐 Network Configuration

### Port Requirements

Dockerflare requires these ports to be available:

- **3000**: Main application (configurable via `PORT` env var)
- **2375/2376**: Docker Engine API on hosts (configurable)
- **80/443**: Web interface (production deployments)

### WebSocket Connections

Dockerflare establishes WebSocket connections for real-time features:

- **Path**: `/api/docker/ws/:containerId`
- **Protocol**: WebSocket over HTTP/HTTPS
- **Purpose**: Live logs, stats, terminal sessions, deployments

## 🐳 Docker Configuration

### Host Detection

Dockerflare automatically discovers hosts through:

1. **Cloudflare WARP**: Device registry and tunnel management
2. **Docker Engine API**: Container enumeration and management
3. **In-Memory Caching**: Host status and metadata storage

### Security Considerations

```json
// Recommended Docker daemon configuration
{
  "hosts": ["unix:///var/run/docker.sock"],
  "tls": true,
  "tlsverify": true,
  "tlscacert": "/path/to/ca.pem",
  "tlscert": "/path/to/server-cert.pem",
  "tlskey": "/path/to/server-key.pem",
  "host": "tcp://0.0.0.0:2376"
}
```

## ☁️ Cloudflare Integration

### Zero Trust Setup

1. Create a Cloudflare Zero Trust organization
2. Generate an enrollment token for Docker hosts
3. Configure tunnel access policies
4. Register Docker hosts with WARP

### Tunnel Configuration

Dockerflare uses Cloudflare tunnels for secure connectivity:

- **Automatic Discovery**: Hosts register via WARP device registry
- **IPv4 Tunneling**: Secure connections without exposing ports
- **Zero-Trust Security**: Authentication and authorization per device

## 🧪 Testing Setup

```bash
# Run tests (when implemented)
bun test

# E2E testing setup (future)
bun run test:e2e
```

## 🚀 Deployment

### Development Deployment

```bash
# Build the application
bun run build

# Start production server
NODE_ENV=production bun run start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t dockerflare .

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="file:./data/dev.db" \
  dockerflare
```

## 🔍 Troubleshooting Setup

### Common Issues

**Port Already in Use:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**Docker Connection Failed:**

```bash
# Check Docker daemon status
docker info

# Check Docker Engine API
curl http://localhost:2375/info
```

**Database Connection Issues:**

```bash
# Check database file permissions
ls -la dev.db

# Reset database
bunx prisma migrate reset
```

### Logs and Debugging

```bash
# View application logs
tail -f logs/application.log

# Debug WebSocket connections
DEBUG=* bun run dev

# Check Docker container logs
docker logs <container-id>
```

## ✅ Verification

Ensure everything is working:

1. ✅ Application starts on port 3000
2. ✅ Database connection successful
3. ✅ Docker hosts detectable
4. ✅ WebSocket connections functional
5. ✅ Container operations working

Once verified, Dockerflare is ready for use!

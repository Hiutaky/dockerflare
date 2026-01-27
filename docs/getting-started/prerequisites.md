# Prerequisites

Before setting up Dockerflare, ensure your environment meets these requirements. This document outlines all system dependencies and configurations needed for successful installation and operation.

## 💻 System Requirements

### Operating System

**Supported Platforms:**

- **Linux**: Ubuntu 18.04+, CentOS 7+, Fedora 30+, Debian 10+
- **macOS**: 10.15 (Catalina) or later
- **Windows**: 10/11 with WSL2 (Windows Subsystem for Linux)

**Recommended:**

- Ubuntu 20.04 LTS or later
- macOS 12 (Monterey) or later

### Hardware Requirements

**Development Environment:**

- **RAM**: Minimum 8GB, Recommended 16GB
- **CPU**: 2-core minimum, 4-core recommended
- **Storage**: 10GB free space for Docker images and databases
- **Network**: Stable internet connection for package downloads

**Production Environment:**

- **RAM**: 16GB minimum, 32GB+ recommended
- **CPU**: 4-core minimum, 8-core+ recommended
- **Storage**: 50GB+ for container images, logs, and databases
- **Network**: High-speed, low-latency connection

## 📦 Software Dependencies

### Node.js Runtime

**Requirements:**

- **Version**: Node.js 18.0.0 or higher
- **Architecture**: x64 or ARM64
- **Package Manager**: npm or yarn (comes with Node.js)

**Installation:**

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Alternative: Direct download
# Download from https://nodejs.org/dist/v20.10.0/
```

**Verification:**

```bash
node --version  # Should show 18.0.0 or higher
npm --version   # Should show 8.0.0 or higher
```

### Bun Runtime (Optional but Recommended)

**Why Bun?**

- Faster package installation and script execution
- Drop-in replacement for npm/yarn
- Native TypeScript execution

**Installation:**

```bash
# Install Bun (Linux/macOS)
curl -fsSL https://bun.sh/install | bash

# Windows
# Download from https://bun.sh/
```

**Verification:**

```bash
bun --version  # Should show latest version
```

## 🐳 Docker Engine

### Docker Engine Requirements

**Version Requirements:**

- **Docker Engine**: 20.10.0 or higher
- **Docker Compose**: V2 (plugin-based) recommended
- **Docker Buildx**: For advanced build features

**Installation:**

**Linux:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ca-certificates curl gnupg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker Engine API (required)
sudo nano /etc/docker/daemon.json

# Add to daemon.json:
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tls": false
}

sudo systemctl restart docker
```

**macOS:**

```bash
# Install Docker Desktop for Mac
# Download from https://docs.docker.com/desktop/install/mac-install/

# Enable Docker Engine API in Docker Desktop settings
# Settings → Advanced → Enable "Expose daemon on tcp://localhost:2376 without TLS"
```

**Windows:**

```bash
# Install Docker Desktop for Windows
# Download from https://docs.docker.com/desktop/install/windows-install/

# Enable WSL2 integration and Docker Engine API
```

**Verification:**

```bash
docker --version          # Should show 20.10.0+
docker-compose --version  # Should show v2.x
docker info              # Should show daemon is running
```

### Docker Permissions

**Linux Setup:**

```bash
# Add user to docker group (avoid using sudo)
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker

# Test without sudo
docker ps
```

**Permission Verification:**

```bash
docker ps  # Should work without sudo after group change
```

### Docker Engine API Access

**Security Warning:** The Docker Engine API is unauthenticated by default. For production deployments:

1. Use TLS certificates
2. Restrict network access (firewall)
3. Use Cloudflare WARP tunnels instead of direct exposure

**Basic Configuration:**

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://127.0.0.1:2376"],
  "tls": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## ☁️ Cloudflare WARP

### WARP Requirements

**Purpose:** Secure tunneling between Dockerflare and Docker hosts

**System Requirements:**

- **OS**: Linux, macOS, Windows
- **Network**: Internet connection
- **Permissions**: Administrator/root access for installation

**Installation:**

**Linux:**

```bash
# Ubuntu/Debian
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ jammy main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
sudo apt update && sudo apt install cloudflare-warp

# Fedora/CentOS
sudo rpm import https://pkg.cloudflareclient.com/pubkey.gpg
sudo tee /etc/yum.repos.d/cloudflare-warp.repo <<EOF
[cloudflare-warp]
name=Cloudflare WARP
baseurl=https://pkg.cloudflareclient.com/dnf/\$basearch
enabled=1
gpgcheck=1
gpgkey=https://pkg.cloudflareclient.com/pubkey.gpg
EOF
sudo dnf install cloudflare-warp
```

**macOS:**

```bash
brew install --cask cloudflare-warp
```

**Windows:**
Download from [https://one.one.one.one/](https://one.one.one.one/)

**Verification:**

```bash
warp-cli --version    # Should show version number
warp-cli status      # Should show disconnected initially
```

### Cloudflare Zero Trust Organization

**Requirements:**

- Cloudflare account with Zero Trust enabled
- Team name and enrollment token
- Organization policies configured

**Setup:**

1. Go to [Cloudflare Zero Trust](https://one.one.one.one/)
2. Create a new organization
3. Generate enrollment token
4. Configure device enrollment rules

## 🛠️ Development Tools

### Version Control

**Git:**

- **Version**: 2.25.0 or higher
- Repository: https://github.com/Hiutaky/localflare.git

```bash
git --version  # Should show 2.25.0+

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Code Editor

**Recommended:**

- **VS Code** or **VSCodium** (used for development)
- **Extensions**:
  - TypeScript and JavaScript Language Features
  - Prisma
  - Tailwind CSS IntelliSense
  - Docker
  - ESLint
  - Prettier

**VS Code Setup:**

```bash
# Install recommended extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

## 🌐 Network Requirements

### Port Availability

**Required Ports:**

- **3000**: Dockerflare application (default)
- **2375/2376**: Docker Engine API
- **80/443**: HTTP/HTTPS (production)
- **22**: SSH (if deploying via SSH)

**Check Port Availability:**

```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :2376

# Or using lsof
lsof -i :3000
```

### Firewall Configuration

**Linux (ufw):**

```bash
# Allow Dockerflare ports
sudo ufw allow 3000/tcp
sudo ufw allow 2376/tcp  # Only if exposing Docker API

# Allow Cloudflare WARP (if using local firewall)
sudo ufw allow out to 162.159.192.0/24
sudo ufw allow out to 162.159.193.0/24
```

**Network Policies:**

- Allow outbound connections to Cloudflare (one.one.one.one)
- Allow Docker Engine API access from localhost only
- Restrict production ports to necessary sources

## 💾 Storage Requirements

### Disk Space Breakdown

**Development:**

- **Source Code**: ~50MB (git repository)
- **Dependencies**: ~500MB (node_modules)
- **Database**: ~10MB (SQLite file)
- **Docker Images**: 1-5GB (depending on images used)

**Production:**

- **Application**: ~100MB (built assets)
- **Database**: Variable (grows with audit logs)
- **Docker Images**: 10GB+ (production container images)
- **Logs**: Variable (depends on retention policy)

### File System Permissions

**Linux/Mac Permissions:**

```bash
# Ensure proper permissions for database directory
mkdir -p packages/application/prisma
chmod 755 packages/application
chmod 644 packages/application/prisma/schema.prisma

# Database file permissions
touch packages/application/dev.db
chmod 664 packages/application/dev.db
```

## 🚀 Performance Recommendations

### System Tuning

**Linux Optimizations:**

```bash
# Increase file watchers for large projects
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Docker performance tuning
echo '{"storage-driver": "overlay2", "log-driver": "json-file"}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

**Memory Management:**

- Allocate adequate RAM for Docker Desktop
- Monitor Docker resource usage
- Configure swap space appropriately

## ✅ Pre-Installation Checklist

Use this checklist before starting installation:

### System Verification

- [ ] Operating system meets minimum requirements
- [ ] Hardware meets RAM/CPU/storage requirements
- [ ] Internet connection is stable and fast
- [ ] Administrator/root access available

### Software Installation

- [ ] Node.js 18+ installed and in PATH
- [ ] npm or yarn package manager working
- [ ] Bun runtime installed (optional but recommended)
- [ ] Git 2.25+ installed and configured
- [ ] Code editor installed with required extensions

### Docker Setup

- [ ] Docker Engine 20.10+ installed
- [ ] Docker daemon running
- [ ] User added to docker group (Linux)
- [ ] Docker Engine API enabled (port 2375/2376)
- [ ] Docker Compose V2 available

### Cloudflare Setup

- [ ] Cloudflare Zero Trust organization created
- [ ] Enrollment token generated
- [ ] Cloudflare WARP installed on target hosts
- [ ] WARP client authenticated with organization

### Network Configuration

- [ ] Required ports (3000, 2376) available
- [ ] Firewall rules configured appropriately
- [ ] DNS resolution working
- [ ] Network allows outbound connections to Cloudflare

### Storage & Permissions

- [ ] Sufficient disk space available
- [ ] File system permissions configured
- [ ] Database directory writable
- [ ] Git repository accessible

Once all prerequisites are met, proceed to the [setup guide](setup.md) for installation instructions.

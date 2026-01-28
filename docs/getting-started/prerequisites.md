# Prerequisites

Before setting up Dockerflare, ensure your environment meets these requirements.
This document outlines all system dependencies and configurations needed for successful installation and operation.

## 💻 System Requirements

### Operating System

**Supported Platforms:**

- **Linux**: Ubuntu 18.04+, CentOS 7+, Fedora 30+, Debian 10+
- **macOS**: 10.15 (Catalina) or later
- **Windows**: 10/11 with WSL2 (Windows Subsystem for Linux)

**Recommended:**

- Ubuntu 20.04 LTS or later
- macOS 12 (Monterey) or later

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
```

**Enable Docker Engine API HTTP (required)**

On linux you can enable remote API via HTTP in two different ways:

1. Editing deamon.json file

```bash
sudo nano /etc/docker/daemon.json

# Add to daemon.json:
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"],
  "tls": false
}

sudo systemctl restart docker
```

2. Editing systemd configuration

```bash
sudo systemctl edit docker.service

# add the following lines and save
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2375

# restart the service
sudo systemctl restart docker
```

**NOTE**: by using 0.0.0.0 as address, Docker API will be exposed for all the network interfaces. If you want to restrict access only to Cloudflare WARP members, then use the assigned Cloudflare static IP address (100.x.x.x).

```bash
ifconfig | grep Cloudflare -A 1

# or

ip addr | grep Cloudflare
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

## 🌐 Network Requirements

### Port Availability

**Required Ports:**

- **3000**: Dockerflare application (default)
- **2375**: Docker Engine API
- **80/443**: HTTP/HTTPS (production)
- **22**: SSH (if deploying via SSH)

**Check Port Availability:**

```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :2375

# Or using lsof
lsof -i :3000
```

Once all prerequisites are met, proceed to the [setup guide](setup.md) for installation instructions.

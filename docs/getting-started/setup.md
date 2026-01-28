# Setup & Installation

This guide will walk you through setting up Dockerflare for development and deployment.

## 🚀 Quick Start

### Prerequisites

Before installing Dockerflare, ensure you have:

- **Node.js**: Version 18+ (LTS recommended)
- **Bun**: Latest version (for optimal performance)
- **Docker**: Latest stable version with Docker Engine API enabled
- **Cloudflare WARP**: Installed and configured on Docker hosts

## 📋 Detailed Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/Hiutaky/dockerflare.git
cd dockerflare

# Install dependencies
bun install
```

### 2. Application Setup

```bash
# Install dependencies
bun install

# Set up the database
bunx prisma generate
bunx prisma migrate dev --name init
```

### 3. Environment Configuration

Create environment files as needed:
```bash
cp .env.example .env
```

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"

# your cloudflare api token
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
# Add any additional environment variables your deployment requires
```

### 4. Run dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to access Dockerflare.

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
bun lint:fix

# Type check
bunx tsc --noEmit

# Format code
bun prettier:fix
```

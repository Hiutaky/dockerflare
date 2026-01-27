# Database Architecture

Dockerflare uses **Prisma ORM** with **SQLite** for data persistence. The database design evolved from managing hosts directly to leveraging Cloudflare WARP for decentralized host discovery and management.

## 🗄️ Database Overview

### Tech Stack

- **ORM**: Prisma - Type-safe database access
- **Database**: SQLite - File-based, zero-configuration
- **Migration System**: Prisma Migrate - Version-controlled schema changes

### Key Characteristics

- **File-Based**: Database stored as `dev.db` in the application directory
- **ACID Compliance**: Reliable transactions and data integrity
- **No Server Required**: No separate database server setup or configuration
- **Backup-Friendly**: Simple file copy for backups

## 📋 Schema Design

### Current Schema (Simplified)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  engine = "client"
  runtime = "bun"
}

datasource db {
  provider = "sqlite"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("User")
  createdAt DateTime @default(now())
  auditLogs AuditLog[]

  @@map("users")
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action     String   // e.g., "Started container", "Deployed service"
  deviceId   String?  // Cloudflare WARP device ID reference
  containerId String?
  details    String?  // JSON string for additional context
  timestamp  DateTime @default(now())

  @@map("audit_logs")
}
```

### Schema Evolution

#### Initial Design (Hosts Table)

The original schema included a `hosts` table for managing registered Docker hosts:

```sql
-- Migration: 20260108172819_init
CREATE TABLE "hosts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tunnelUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Offline',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
```

#### Migration to Cloudflare WARP

**Date:** January 20, 2026
**Reason:** Cloudflare WARP provides more secure, decentralized host management

**Changes:**

- ❌ Dropped `hosts` table
- 🔄 Modified `audit_logs` table to use `deviceId` instead of `hostId`
- ✅ Hosts now discovered dynamically via Cloudflare WARP API
- ✅ Host metadata stored in in-memory cache (`hostStore`)

## 🏗️ Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │───▶│  In-Memory Cache │    │     SQLite      │
│   WARP API      │    │   (hostStore)    │    │   Database      │
│                 │    │                  │    │                 │
│ • Device List   │    │ • Status         │    │ • Users         │
│ • Metadata      │    │ • Container      │    │ • Audit Logs    │
│ • IPv4 Tunnel   │    │ • Counts         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    Discovery               Real-time             Historical
    & Tunnels               Monitoring            Records
```

## 🗂️ Data Models

### User Model

**Purpose:** Authentication and user management (via NextAuth.js)

```typescript
interface User {
  id: string; // CUID primary key
  email: string; // Unique identifier
  name?: string; // Display name
  role: string; // "Admin" | "User" (default: "User")
  createdAt: DateTime; // Account creation timestamp
  auditLogs: AuditLog[]; // Related audit entries
}
```

### AuditLog Model

**Purpose:** Track all user actions for compliance and debugging

```typescript
interface AuditLog {
  id: string; // CUID primary key
  userId: string; // Reference to acting user
  user: User; // Populated user data
  action: string; // Action description ("Started container", etc.)
  deviceId?: string; // Cloudflare WARP device ID
  containerId?: string; // Docker container ID
  details?: string; // JSON string with additional context
  timestamp: DateTime; // When action occurred
}
```

## 🎯 Design Decisions

### Why SQLite?

- **Zero Configuration**: No database server setup required
- **File-Based**: Easy deployment and backup (just copy `dev.db`)
- **Performance**: Excellent for read-heavy workloads (audit logs)
- **ACID Compliance**: Reliable transactions for audit trail integrity
- **Embedded**: Single binary deployment with no external dependencies

### Why Audit Logs Only?

- **Stateless Design**: Hosts managed via Cloudflare WARP API
- **No Persistence of Ephemeral Data**: Container states change frequently
- **Compliance-Ready**: Complete audit trail of user actions
- **Minimal Storage**: SQLite efficient for logging workloads

### Migration Strategy

- **Prisma Migrations**: Version-controlled, reversible schema changes
- **Safe Rollbacks**: Prisma ensures data integrity during migrations
- **Incremental Updates**: Each migration represents a single, testable change

## 🔄 Data Access Patterns

### Repository Pattern (Prisma Client)

```typescript
// Example: Audit logging utility
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function logUserAction(
  userId: string,
  action: string,
  deviceId?: string,
  containerId?: string,
  details?: object,
) {
  return await prisma.auditLog.create({
    data: {
      userId,
      action,
      deviceId,
      containerId,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
```

### Common Queries

```typescript
// Recent activity feed
const recentActivity = await prisma.auditLog.findMany({
  take: 10,
  orderBy: { timestamp: "desc" },
  include: { user: { select: { name: true, email: true } } },
});

// User audit history
const userHistory = await prisma.auditLog.findMany({
  where: { userId: user.id },
  orderBy: { timestamp: "desc" },
});
```

## 🔒 Data Integrity & Performance

### Indexes & Constraints

- **Primary Keys**: CUID for distributed systems compatibility
- **Unique Constraints**: Email uniqueness for users
- **Foreign Keys**: Cascade deletes for data consistency
- **Timestamps**: Automatic creation/update timestamps

### Performance Optimizations

- **Connection Pooling**: Prisma handles connection optimization
- **Query Optimization**: Built-in query analysis and optimization
- **Lazy Loading**: Include relations only when needed
- **Pagination**: Cursor-based pagination for large result sets

## 🚀 Deployment Considerations

### Development

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (if needed)
npx prisma db seed
```

### Production

```bash
# Run migrations only (no dev flag)
npx prisma migrate deploy

# Verify database health
npx prisma db push --preview-feature
```

### Backup Strategy

- **File-Based Backup**: Copy `dev.db` file regularly
- **Automated Backups**: Cron job to backup before deployments
- **Migration Rollback**: Prisma can rollback to previous states

## 📊 Monitoring & Maintenance

### Health Checks

- **Connection Validation**: Prisma client connection health
- **Migration Status**: Check if migrations are up-to-date
- **Storage Monitoring**: Monitor database file size growth

### Maintenance Tasks

- **Vacuum Operations**: SQLite database optimization
- **Log Rotation**: Archive old audit logs if needed
- **Performance Tuning**: Monitor query performance with Prisma Studio

## 🛠️ Development Tools

### Prisma Studio

**GUI Database Manager**

```bash
npx prisma studio
# Opens http://localhost:5555
```

### Database Utilities

```bash
# View migration history
npx prisma migrate status

# Reset database (development only)
npx prisma migrate reset

# Format schema
npx prisma format
```

## 🎯 Future Considerations

- **Scaling**: Monitor SQLite performance with increased audit volume
- **Data Archiving**: Implement log rotation for compliance requirements
- **Analytics**: Add aggregate queries for usage insights
- **Multi-Tenancy**: Database-per-tenant if multi-user features expand

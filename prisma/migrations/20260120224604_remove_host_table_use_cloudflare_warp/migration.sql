/*
  Warnings:

  - You are about to drop the `hosts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `hostId` on the `audit_logs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "hosts_deviceId_key";

-- DropIndex
DROP INDEX "hosts_tunnelUrl_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "hosts";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "deviceId" TEXT,
    "containerId" TEXT,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "containerId", "details", "id", "timestamp", "userId") SELECT "action", "containerId", "details", "id", "timestamp", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

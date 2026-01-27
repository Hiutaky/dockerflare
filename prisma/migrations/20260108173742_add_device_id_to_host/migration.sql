/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `hosts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "hosts" ADD COLUMN "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "hosts_deviceId_key" ON "hosts"("deviceId");

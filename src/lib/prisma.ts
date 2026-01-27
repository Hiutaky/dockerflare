import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL!,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

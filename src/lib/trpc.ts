import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "./prisma";
import { RouteMeta } from "trpc-docs-generator";
export const createTRPCContext = async () => {
  return {
    db: prisma,
  };
};

const t = initTRPC
  .meta<RouteMeta>()
  .context<typeof createTRPCContext>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

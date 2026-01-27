import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "./prisma";

export const createTRPCContext = () => {
  return {
    db: prisma,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

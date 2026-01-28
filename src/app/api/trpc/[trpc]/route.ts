import { env } from "process";
import { type NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/lib/trpc";
import { AppRouter, appRouter } from "@/lib/routers/index";
/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async () => {
  return createTRPCContext();
};

const handler = (req: NextRequest) =>
  fetchRequestHandler<AppRouter>({
    createContext: () => createContext(),
    endpoint: "/api/trpc",
    req,
    router: appRouter,
  });

export { handler as GET, handler as POST };

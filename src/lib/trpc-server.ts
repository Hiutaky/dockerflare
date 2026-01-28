import {
  createTRPCProxyClient,
  loggerLink,
  TRPCClientError,
} from "@trpc/client";
import { appRouter, AppRouter } from "./routers";
import { observable } from "@trpc/server/observable";
import { createTRPCContext } from "./trpc";
import { callTRPCProcedure } from "@trpc/server";
import { TRPCErrorResponse } from "@trpc/server/unstable-core-do-not-import";
import { cache } from "react";
const createContext = cache(() => {
  return createTRPCContext();
});
export const api = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    /**
     * Custom RSC link that lets us invoke procedures without using http requests. Since Server
     * Components always run on the server, we can just call the procedure as a function.
     */
    () =>
      ({ op }) =>
        observable((observer) => {
          createContext()
            .then(async (ctx) => {
              const data = await callTRPCProcedure({
                ctx,

                getRawInput: async () => op.input,
                path: op.path,
                router: appRouter,
                signal: op.signal!,
                type: op.type,
              });
              observer.next({
                result: {
                  data,
                },
              });
              observer.complete();
            })
            .catch((cause: TRPCErrorResponse) => {
              console.error(`tRPC Error on ${op.path}:`, cause);

              // Trasforma l'errore in un formato che tRPC Client comprende
              observer.error(TRPCClientError.from(cause));
            });
        }),
  ],
});

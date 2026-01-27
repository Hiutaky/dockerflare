import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { router } from "../trpc";
import { dockerRouter } from "./docker";

export const appRouter = router({
  docker: dockerRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

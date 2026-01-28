import { createTRPCReact } from "@trpc/react-query";
import { AppRouter } from "@/lib/routers/index";
export const trpc = createTRPCReact<AppRouter>();

import { appRouter } from "@/lib/routers";
import { collectRoutes, generateDocsHtml } from "trpc-docs-generator";

export async function GET() {
  const routes = collectRoutes(appRouter);
  const html = generateDocsHtml(routes, {
    title: "Dockerflare API Doc",
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

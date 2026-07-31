import Fastify from "fastify";

import { InMemorySandboxBroker } from "./broker.js";

export const buildServer = () => {
  const app = Fastify({ logger: true });
  const broker = new InMemorySandboxBroker();

  app.get("/healthz", async () => ({ status: "ok", service: "broker" }));

  app.post<{ Body: { runId: string; image: string; cpuLimit: number; memoryLimitMb: number } }>(
    "/sandboxes",
    async (request) => broker.create(request.body),
  );

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3002);

  await app.listen({ host: "0.0.0.0", port });
}

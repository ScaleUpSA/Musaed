import Fastify from "fastify";

import { SandboxRequestSchema, type SandboxRequest } from "@musaed/contracts";

import { InMemorySandboxBroker } from "./broker.js";
import { loadBrokerConfig } from "./config.js";

export const buildServer = () => {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });
  const broker = new InMemorySandboxBroker();

  app.get("/healthz", async () => ({ status: "ok", service: "broker" }));

  app.post<{ Body: SandboxRequest }>(
    "/sandboxes",
    { schema: { body: SandboxRequestSchema } },
    async (request) => broker.create(request.body),
  );

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadBrokerConfig(process.env);
  const app = buildServer();

  await app.listen({ host: "0.0.0.0", port: config.port });
}

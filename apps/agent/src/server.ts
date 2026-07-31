import Fastify from "fastify";

import { RunEnvelopeSchema, type RunEnvelope } from "@musaed/contracts";

import { loadAgentConfig, type AgentConfig } from "./config.js";
import { prepareRun } from "./run.js";

export const buildServer = (config: AgentConfig) => {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });

  app.get("/healthz", async () => ({ status: "ok", service: "agent" }));

  app.post<{ Body: RunEnvelope }>(
    "/runs/prepare",
    { schema: { body: RunEnvelopeSchema } },
    async (request) => prepareRun(request.body, config),
  );

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadAgentConfig(process.env);
  const app = buildServer(config);

  await app.listen({ host: "0.0.0.0", port: config.port });
}

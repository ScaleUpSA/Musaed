import Fastify from "fastify";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";

import { RunEnvelopeRequestSchema, type AgentEvent } from "@musaed/contracts";

import { loadAgentConfig, type AgentConfig } from "./config.js";
import { verifyRunEnvelope } from "./envelope.js";
import { executeRun, prepareRun, closePreparedRun } from "./run.js";

const postEvent = async (
  url: string,
  callbackToken: string,
  event: AgentEvent,
): Promise<void> => {
  const target = new URL(url);
  const request = target.protocol === "https:" ? httpsRequest : httpRequest;

  await new Promise<void>((resolve, reject) => {
    const client = request(
      target,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-run-callback-token": callbackToken,
        },
      },
      (response) => {
        response.resume();
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error("Event callback rejected"));
          return;
        }
        resolve();
      },
    );

    client.on("error", reject);
    client.end(JSON.stringify(event));
  });
};

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

  app.post(
    "/runs/prepare",
    { schema: { body: RunEnvelopeRequestSchema } },
    async (request) => {
      const prepared = await prepareRun(verifyRunEnvelope(request.body, config), config);
      try {
        return prepared.summary;
      } finally {
        await closePreparedRun(prepared);
      }
    },
  );

  app.post(
    "/runs/execute",
    { schema: { body: RunEnvelopeRequestSchema } },
    async (request, reply) => {
      const envelope = verifyRunEnvelope(request.body, config);
      const emit = async (event: AgentEvent): Promise<void> => {
        await postEvent(envelope.callbacks.eventsUrl, envelope.callbacks.callbackToken, event);
      };

      setImmediate(() => {
        void executeRun(envelope, config, emit);
      });
      return reply.code(202).send({ runId: envelope.runId, status: "accepted" });
    },
  );

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadAgentConfig(process.env);
  const app = buildServer(config);

  await app.listen({ host: "0.0.0.0", port: config.port });
}

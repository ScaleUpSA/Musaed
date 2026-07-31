import Fastify from "fastify";

import type { RunEnvelope } from "@musaed/contracts";

import { prepareRun } from "./run.js";

const runEnvelopeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "runId",
    "userId",
    "groupId",
    "workspaceId",
    "conversationId",
    "allowedModels",
    "workingDirectory",
    "agentDirectory",
    "allowedTools",
    "approvalRequiredTools",
    "litellmVirtualKey",
    "sandbox",
    "callbacks",
    "policyVersion",
    "expiresAt",
    "signature",
  ],
  properties: {
    runId: { type: "string", minLength: 1 },
    userId: { type: "string", minLength: 1 },
    groupId: { type: "string", minLength: 1 },
    workspaceId: { type: "string", minLength: 1 },
    conversationId: { type: "string", minLength: 1 },
    allowedModels: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    workingDirectory: { type: "string", minLength: 1 },
    agentDirectory: { type: "string", minLength: 1 },
    allowedTools: { type: "array", items: { type: "string", minLength: 1 } },
    approvalRequiredTools: { type: "array", items: { type: "string", minLength: 1 } },
    litellmVirtualKey: { type: "string", minLength: 1 },
    sandbox: {
      type: "object",
      additionalProperties: false,
      required: ["enabled", "cpuLimit", "memoryLimitMb", "pidsLimit"],
      properties: {
        enabled: { type: "boolean" },
        cpuLimit: { type: "number", exclusiveMinimum: 0 },
        memoryLimitMb: { type: "number", exclusiveMinimum: 0 },
        pidsLimit: { type: "integer", exclusiveMinimum: 0 },
      },
    },
    callbacks: {
      type: "object",
      additionalProperties: false,
      required: ["eventsUrl", "auditUrl", "approvalsUrl"],
      properties: {
        eventsUrl: { type: "string", minLength: 1 },
        auditUrl: { type: "string", minLength: 1 },
        approvalsUrl: { type: "string", minLength: 1 },
      },
    },
    policyVersion: { type: "string", minLength: 1 },
    expiresAt: { type: "string", format: "date-time" },
    signature: { type: "string", minLength: 1 },
  },
} as const;

const assertVerificationConfiguration = (): void => {
  if (process.env.NODE_ENV === "production" && !process.env.AGENT_ENVELOPE_PUBLIC_KEY) {
    throw new Error("AGENT_ENVELOPE_PUBLIC_KEY is required in production");
  }
};

export const buildServer = () => {
  assertVerificationConfiguration();
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ status: "ok", service: "agent" }));

  app.post<{ Body: RunEnvelope }>("/runs/prepare", { schema: { body: runEnvelopeSchema } }, async (request) => {
    return prepareRun(request.body);
  });

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3001);

  await app.listen({ host: "0.0.0.0", port });
}

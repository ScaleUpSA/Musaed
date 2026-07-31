import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildServer } from "./server.js";
import { prepareRun } from "./run.js";

const envelope = {
  runId: "run-1",
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  allowedModels: ["gpt-4o-mini"],
  workingDirectory: "/tmp/musaed-run-workspace",
  agentDirectory: "/tmp/musaed-run-agent",
  allowedTools: [],
  approvalRequiredTools: [],
  litellmVirtualKey: "sk-virtual-run",
  sandbox: {
    enabled: false,
    cpuLimit: 1,
    memoryLimitMb: 1024,
    pidsLimit: 64,
  },
  callbacks: {
    eventsUrl: "http://web/events",
    auditUrl: "http://web/audit",
    approvalsUrl: "http://web/approvals",
  },
  policyVersion: "policy-1",
  expiresAt: "2030-01-01T00:00:00.000Z",
  signature: "test-signature",
} as const;

describe("agent service", () => {
  it("reports health", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "agent" });
    await app.close();
  });

  it("rejects malformed run envelopes", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: { runId: "missing-fields" },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("does not read or create the home pi directory", async () => {
    const home = mkdtempSync(join(tmpdir(), "musaed-home-"));
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      await prepareRun({
        ...envelope,
        workingDirectory: mkdtempSync(join(tmpdir(), "musaed-workspace-")),
        agentDirectory: mkdtempSync(join(tmpdir(), "musaed-agent-")),
      });

      expect(existsSync(join(home, ".pi"))).toBe(false);
    } finally {
      process.env.HOME = previousHome;
    }
  });

  it("refuses production startup without envelope verification configuration", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousPublicKey = process.env.AGENT_ENVELOPE_PUBLIC_KEY;
    process.env.NODE_ENV = "production";
    delete process.env.AGENT_ENVELOPE_PUBLIC_KEY;

    try {
      expect(() => buildServer()).toThrow("AGENT_ENVELOPE_PUBLIC_KEY is required in production");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AGENT_ENVELOPE_PUBLIC_KEY = previousPublicKey;
    }
  });
});

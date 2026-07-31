import { generateKeyPairSync, sign } from "node:crypto";
import { existsSync, lstatSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { canonicalizeRunEnvelope, type RunEnvelope } from "@musaed/contracts";
import { type AgentConfig, loadAgentConfig } from "./config.js";
import { buildServer } from "./server.js";
import { prepareRun } from "./run.js";

const keyPair = generateKeyPairSync("ed25519");
const publicKey = keyPair.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64");
const privateKey = keyPair.privateKey;

const claims = {
  runId: "run-1",
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  prompt: "Summarize the request",
  allowedModels: ["gpt-4o-mini"],
  workingDirectory: "/tmp/musaed-run-workspace",
  agentDirectory: "/tmp/musaed-run-agent",
  allowedTools: [],
  approvalRequiredTools: [],
  litellmVirtualKey: "sk-virtual-run",
  sandbox: {
    enabled: false,
    cpuLimitMillicores: 1_000,
    memoryLimitMb: 1024,
    pidsLimit: 64,
  },
  callbacks: {
    eventsUrl: "http://web/events",
    auditUrl: "http://web/audit",
    approvalsUrl: "http://web/approvals",
    callbackToken: "callback-token",
  },
  policyVersion: "policy-1",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

const signEnvelope = (value: typeof claims): RunEnvelope => ({
  ...value,
  signature: sign(
    null,
    Buffer.from(canonicalizeRunEnvelope(value)),
    privateKey,
  ).toString("base64url"),
});

const envelope = signEnvelope(claims);

const createConfig = (agentRunRoot: string): AgentConfig => ({
  port: 3001,
  agentRunRoot,
  litellmUrl: "http://litellm:4000",
  envelopePublicKey: publicKey,
  envelopeClockSkewMs: 30_000,
});

describe("agent service", () => {
  it("reports health", async () => {
    const app = buildServer(createConfig("/tmp/musaed-test-runs"));
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "agent" });
    await app.close();
  });

  it("rejects malformed run envelopes", async () => {
    const app = buildServer(createConfig("/tmp/musaed-test-runs"));
    const response = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: { runId: "missing-fields" },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("rejects additional properties and type coercion", async () => {
    const app = buildServer(createConfig("/tmp/musaed-test-runs"));

    const extraPropertyResponse = await app.inject({
      method: "POST",
      url: "/runs/prepare",
        payload: { ...envelope, unexpected: true },
    });
    const numericStringResponse = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: {
        ...envelope,
        sandbox: { ...envelope.sandbox, cpuLimitMillicores: "1000" },
      },
    });
    const stringArrayResponse = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: { ...envelope, allowedModels: "gpt-4o-mini" },
    });

    expect(extraPropertyResponse.statusCode).toBe(400);
    expect(numericStringResponse.statusCode).toBe(400);
    expect(stringArrayResponse.statusCode).toBe(400);
    await app.close();
  });

  it("does not read or create the home pi directory", async () => {
    const home = mkdtempSync(join(tmpdir(), "musaed-home-"));
    const root = mkdtempSync(join(tmpdir(), "musaed-run-root-"));
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      await prepareRun({
        ...envelope,
        workingDirectory: join(root, "workspace"),
        agentDirectory: join(root, "agent"),
      }, createConfig(root));

      expect(existsSync(join(home, ".pi"))).toBe(false);
    } finally {
      process.env.HOME = previousHome;
    }
  });

  it("rejects paths outside the configured run root", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-root-"));
    const app = buildServer(createConfig(root));

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: signEnvelope({
          ...claims,
          workingDirectory: "/root/.pi",
          agentDirectory: join(root, "agent"),
        }),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("RUN_PATH_OUTSIDE_ROOT");

      await expect(
        prepareRun(signEnvelope({
          ...claims,
          workingDirectory: join(root, "..", "outside"),
          agentDirectory: join(root, "agent"),
        }), createConfig(root)),
      ).rejects.toThrow("Path must be inside AGENT_RUN_ROOT");
    } finally {
      await app.close();
    }
  });

  it("rejects symlinked paths inside the configured run root", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-root-"));
    const outside = mkdtempSync(join(tmpdir(), "musaed-outside-"));
    const linked = join(root, "linked");
    symlinkSync(outside, linked);
    const app = buildServer(createConfig(root));

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: signEnvelope({
          ...claims,
          workingDirectory: join(root, "workspace"),
          agentDirectory: linked,
        }),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("RUN_PATH_SYMLINK");
      expect(lstatSync(linked).isSymbolicLink()).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("returns a server error for genuine filesystem failures", async () => {
    const rootFile = join(tmpdir(), `musaed-run-root-${Date.now()}`);
    writeFileSync(rootFile, "not a directory");
    const app = buildServer(createConfig(rootFile));

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: signEnvelope({
          ...claims,
          workingDirectory: join(rootFile, "workspace"),
          agentDirectory: join(rootFile, "agent"),
        }),
      });

      expect(response.statusCode).toBe(500);
    } finally {
      await app.close();
    }
  });

  it("requires security and routing configuration at startup", () => {
    expect(() =>
      loadAgentConfig({
        NODE_ENV: "production",
        AGENT_RUN_ROOT: "/tmp/musaed-runs",
        LITELLM_URL: "http://litellm:4000",
      }),
    ).toThrow("AGENT_ENVELOPE_PUBLIC_KEY is required");
    expect(() =>
      loadAgentConfig({
        AGENT_RUN_ROOT: "/tmp/musaed-runs",
        AGENT_ENVELOPE_PUBLIC_KEY: publicKey,
      }),
    ).toThrow("LITELLM_URL is required");
    expect(() =>
      loadAgentConfig({
        LITELLM_URL: "http://litellm:4000",
        AGENT_ENVELOPE_PUBLIC_KEY: publicKey,
      }),
    ).toThrow("AGENT_RUN_ROOT is required");
  });
});

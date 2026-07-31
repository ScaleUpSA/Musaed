import { existsSync, lstatSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
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

  it("rejects additional properties and type coercion", async () => {
    const app = buildServer();

    const extraPropertyResponse = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: { ...envelope, unexpected: true },
    });
    const numericStringResponse = await app.inject({
      method: "POST",
      url: "/runs/prepare",
      payload: { ...envelope, sandbox: { ...envelope.sandbox, cpuLimit: "1" } },
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
    const previousRunRoot = process.env.AGENT_RUN_ROOT;
    process.env.HOME = home;
    process.env.AGENT_RUN_ROOT = root;

    try {
      await prepareRun({
        ...envelope,
        workingDirectory: join(root, "workspace"),
        agentDirectory: join(root, "agent"),
      });

      expect(existsSync(join(home, ".pi"))).toBe(false);
    } finally {
      process.env.HOME = previousHome;
      process.env.AGENT_RUN_ROOT = previousRunRoot;
    }
  });

  it("rejects paths outside the configured run root", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-root-"));
    const previousRunRoot = process.env.AGENT_RUN_ROOT;
    process.env.AGENT_RUN_ROOT = root;
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: {
          ...envelope,
          workingDirectory: "/root/.pi",
          agentDirectory: join(root, "agent"),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("RUN_PATH_OUTSIDE_ROOT");

      await expect(
        prepareRun({
          ...envelope,
          workingDirectory: join(root, "..", "outside"),
          agentDirectory: join(root, "agent"),
        }),
      ).rejects.toThrow("Path must be inside AGENT_RUN_ROOT");
    } finally {
      process.env.AGENT_RUN_ROOT = previousRunRoot;
      await app.close();
    }
  });

  it("rejects symlinked paths inside the configured run root", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-root-"));
    const outside = mkdtempSync(join(tmpdir(), "musaed-outside-"));
    const linked = join(root, "linked");
    symlinkSync(outside, linked);
    const previousRunRoot = process.env.AGENT_RUN_ROOT;
    process.env.AGENT_RUN_ROOT = root;
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: {
          ...envelope,
          workingDirectory: join(root, "workspace"),
          agentDirectory: linked,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("RUN_PATH_SYMLINK");
      expect(lstatSync(linked).isSymbolicLink()).toBe(true);
    } finally {
      process.env.AGENT_RUN_ROOT = previousRunRoot;
      await app.close();
    }
  });

  it("returns a server error for genuine filesystem failures", async () => {
    const rootFile = join(tmpdir(), `musaed-run-root-${Date.now()}`);
    writeFileSync(rootFile, "not a directory");
    const previousRunRoot = process.env.AGENT_RUN_ROOT;
    process.env.AGENT_RUN_ROOT = rootFile;
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/runs/prepare",
        payload: {
          ...envelope,
          workingDirectory: join(rootFile, "workspace"),
          agentDirectory: join(rootFile, "agent"),
        },
      });

      expect(response.statusCode).toBe(500);
    } finally {
      process.env.AGENT_RUN_ROOT = previousRunRoot;
      await app.close();
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

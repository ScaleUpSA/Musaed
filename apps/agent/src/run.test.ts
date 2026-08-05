import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { AgentEvent, RunEnvelope } from "@musaed/contracts";

import type { AgentConfig } from "./config.js";
import { executeRun } from "./run.js";

const configFor = (root: string): AgentConfig => ({
  port: 3001,
  agentRunRoot: root,
  litellmUrl: "http://127.0.0.1:4000",
  envelopePublicKey: "unused-in-direct-execution-test",
  envelopeClockSkewMs: 30_000,
  modelRequestTimeoutMs: 30_000,
});

const envelopeFor = (
  root: string,
  allowedTools: string[],
): RunEnvelope => ({
  runId: `run-${Math.random().toString(16).slice(2)}`,
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  prompt: "MUSAED_PLACEHOLDER_TOOL_TEST",
  allowedModels: ["assistant"],
  modelAlias: "assistant",
  modelName: "fake-model",
  modelImplementation: "fake",
  workingDirectory: join(root, "workspace"),
  agentDirectory: join(root, "agent"),
  allowedTools,
  approvalRequiredTools: [],
  litellmVirtualKey: "fake-litellm-key",
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
  signature: "signature",
});

describe("executeRun", () => {
  it("does not call the separate user_bash execution path", () => {
    const runtimeSource = readFileSync(new URL("./run.ts", import.meta.url), "utf8");

    expect(runtimeSource).not.toContain("executeBash(");
  });

  it("executes an allowed placeholder tool and streams its response", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-"));
    const events: AgentEvent[] = [];
    const envelope = envelopeFor(root, ["write"]);

    await executeRun(envelope, configFor(root), async (event) => {
      events.push(event);
    });

    expect(existsSync(join(root, "workspace", "placeholder-tool-output.txt"))).toBe(true);
    expect(events.some((event) => event.type === "assistant.delta")).toBe(true);
    expect(events.findIndex((event) => event.type === "tool.called")).toBeLessThan(
      events.findIndex((event) => event.type === "tool.completed"),
    );
    expect(events.at(-1)?.type).toBe("run.completed");
  });

  it("blocks a placeholder tool outside the envelope without creating its file", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-"));
    const blocked: Extract<AgentEvent, { type: "tool.blocked" }>[] = [];
    const events: AgentEvent[] = [];
    const envelope = envelopeFor(root, []);

    await executeRun(envelope, configFor(root), async (event) => {
      events.push(event);
      if (event.type === "tool.blocked") {
        blocked.push(event);
      }
    });

    expect(existsSync(join(root, "workspace", "placeholder-tool-output.txt"))).toBe(false);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({
      type: "tool.blocked",
      toolName: "write",
      toolCallId: "placeholder-write-call",
    });
  });

  it("sanitizes runtime failures before emitting run.failed", async () => {
    const root = mkdtempSync(join(tmpdir(), "musaed-run-"));
    const secret = "sk-provider-secret-never-forward";
    const envelope = {
      ...envelopeFor(root, []),
      workingDirectory: join(root, "..", secret),
    };
    const events: AgentEvent[] = [];

    await executeRun(envelope, configFor(root), async (event) => {
      events.push(event);
    });

    expect(events.at(-1)).toMatchObject({
      type: "run.failed",
      error: "Run failed.",
    });
    expect(JSON.stringify(events)).not.toContain(secret);
    expect(JSON.stringify(events)).not.toContain("sk-provider-secret");
  });
});

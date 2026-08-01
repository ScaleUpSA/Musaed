import { describe, expect, it, vi } from "vitest";

import type { RunEnvelope } from "@musaed/contracts";

import type { AgentConfig } from "./config.js";
import { streamModelResponse } from "./model-provider.js";

const envelope = {
  runId: "run-1",
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  prompt: "Summarize the request",
  allowedModels: ["assistant"],
  modelAlias: "assistant",
  modelName: "gpt-test",
  modelImplementation: "litellm",
  workingDirectory: "/tmp/runs/run-1/workspace",
  agentDirectory: "/tmp/runs/run-1/agent",
  allowedTools: [],
  approvalRequiredTools: [],
  litellmVirtualKey: "fake-litellm-key-test",
  sandbox: { enabled: false, cpuLimitMillicores: 1000, memoryLimitMb: 1024, pidsLimit: 64 },
  callbacks: {
    eventsUrl: "http://web/events",
    auditUrl: "http://web/audit",
    approvalsUrl: "http://web/approvals",
    callbackToken: "callback-token",
  },
  policyVersion: "policy-1",
  expiresAt: "2030-01-01T00:00:00.000Z",
} satisfies Omit<RunEnvelope, "signature">;

const config: AgentConfig = {
  port: 3001,
  agentRunRoot: "/tmp/runs",
  litellmUrl: "http://litellm.test",
  modelRequestTimeoutMs: 1000,
  envelopePublicKey: "public-key",
  envelopeClockSkewMs: 30_000,
};

describe("streamModelResponse", () => {
  it("streams LiteLLM chat deltas without reaching the network", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n' +
          'data: {"choices":[{"delta":{"content":" world"}}]}\n\n' +
          "data: [DONE]\n\n",
        { headers: { "content-type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const chunks: string[] = [];
    for await (const chunk of streamModelResponse({ ...envelope, signature: "signature" }, config)) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("Hello world");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://litellm.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"model":"gpt-test"'),
      }),
    );
    vi.unstubAllGlobals();
  });

  it("turns provider status failures into readable errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    const collect = async (): Promise<void> => {
      for await (const chunk of streamModelResponse({ ...envelope, signature: "signature" }, config)) {
        expect(chunk).toBeTypeOf("string");
      }
    };

    await expect(collect()).rejects.toThrow("Model provider rate limit reached.");
    vi.unstubAllGlobals();
  });
});

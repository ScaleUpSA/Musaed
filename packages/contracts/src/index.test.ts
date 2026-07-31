import { describe, expect, it } from "vitest";

import { canonicalizeJson } from "./index.js";
import type { ToolPolicyDecision } from "./index.js";
import type { RunEnvelope } from "./index.js";

describe("contracts", () => {
  it("represents a policy decision", () => {
    const decision: ToolPolicyDecision = {
      decision: "deny",
      reason: "not approved",
    };

    expect(decision.decision).toBe("deny");
  });

  it("round-trips the run envelope shape", () => {
    const envelope: RunEnvelope = {
      runId: "run-1",
      userId: "user-1",
      groupId: "group-1",
      workspaceId: "workspace-1",
      conversationId: "conversation-1",
      allowedModels: ["gpt-4o-mini"],
      workingDirectory: "/tmp/workspace",
      agentDirectory: "/tmp/agent",
      allowedTools: ["read"],
      approvalRequiredTools: ["bash"],
      litellmVirtualKey: "sk-virtual-run",
      sandbox: {
        enabled: true,
        cpuLimitMillicores: 1_500,
        memoryLimitMb: 3072,
        pidsLimit: 128,
      },
      callbacks: {
        eventsUrl: "https://example.test/events",
        auditUrl: "https://example.test/audit",
        approvalsUrl: "https://example.test/approvals",
      },
      policyVersion: "policy-1",
      expiresAt: "2030-01-01T00:00:00.000Z",
      signature: "signature",
    };

    expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  });

  it("canonicalizes UTF-8 byte ordering and string escaping", () => {
    const canonical = canonicalizeJson({
      "\u{10000}": 1,
      "\u{e000}": 2,
      value: "😀\u0001",
    });

    expect(canonical.indexOf('"value"')).toBeLessThan(canonical.indexOf('"\u{e000}"'));
    expect(canonical.indexOf('"\u{e000}"')).toBeLessThan(
      canonical.indexOf('"\u{10000}"'),
    );
    expect(canonical).toContain('"value":"😀\\u0001"');
  });
});

import { generateKeyPairSync, type KeyObject, sign } from "node:crypto";

import { canonicalizeRunEnvelope } from "@musaed/contracts";
import { describe, expect, it } from "vitest";

import type { AgentConfig } from "./config.js";
import { RunEnvelopePolicyError, verifyRunEnvelope } from "./envelope.js";

const createKeys = () => {
  const keyPair = generateKeyPairSync("ed25519");
  const publicKey = keyPair.publicKey
    .export({ format: "der", type: "spki" })
    .subarray(-32)
    .toString("base64");

  return {
    publicKey,
    privateKey: keyPair.privateKey,
  };
};

const claims = {
  runId: "run-1",
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  allowedModels: ["gpt-4o-mini"],
  workingDirectory: "/tmp/musaed-run-workspace",
  agentDirectory: "/tmp/musaed-run-agent",
  allowedTools: ["read"],
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
  },
  policyVersion: "policy-1",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

const signEnvelope = (
  value: typeof claims,
  privateKey: KeyObject,
) => ({
  ...value,
  signature: sign(
    null,
    Buffer.from(canonicalizeRunEnvelope(value)),
    privateKey,
  ).toString("base64url"),
});

const configFor = (publicKey: string): AgentConfig => ({
  port: 3001,
  agentRunRoot: "/tmp/musaed-runs",
  litellmUrl: "http://litellm:4000",
  envelopePublicKey: publicKey,
  envelopeClockSkewMs: 30_000,
});

describe("run envelope verification", () => {
  it("accepts a correctly signed envelope", () => {
    const keys = createKeys();
    const envelope = signEnvelope(claims, keys.privateKey);

    expect(verifyRunEnvelope(envelope, configFor(keys.publicKey), Date.parse("2029-01-01"))).toEqual(
      envelope,
    );
  });

  it.each([
    ["allowedTools", { allowedTools: ["write"] }],
    ["litellmVirtualKey", { litellmVirtualKey: "sk-tampered" }],
  ])("rejects a tampered %s field", (_field, change) => {
    const keys = createKeys();
    const envelope = signEnvelope(claims, keys.privateKey);

    expect(() =>
      verifyRunEnvelope(
        { ...envelope, ...change },
        configFor(keys.publicKey),
        Date.parse("2029-01-01"),
      ),
    ).toThrow(RunEnvelopePolicyError);
  });

  it("rejects a signature from the wrong key", () => {
    const signer = createKeys();
    const verifier = createKeys();
    const envelope = signEnvelope(claims, signer.privateKey);

    expect(() =>
      verifyRunEnvelope(
        envelope,
        configFor(verifier.publicKey),
        Date.parse("2029-01-01"),
      ),
    ).toThrow(RunEnvelopePolicyError);
  });

  it("rejects an expired envelope", () => {
    const keys = createKeys();
    const envelope = signEnvelope(
      { ...claims, expiresAt: "2020-01-01T00:00:00.000Z" },
      keys.privateKey,
    );

    expect(() =>
      verifyRunEnvelope(envelope, configFor(keys.publicKey), Date.parse("2029-01-01")),
    ).toThrow(RunEnvelopePolicyError);
  });

  it("rejects a missing signature", () => {
    const keys = createKeys();

    expect(() =>
      verifyRunEnvelope(claims, configFor(keys.publicKey), Date.parse("2029-01-01")),
    ).toThrow(RunEnvelopePolicyError);
  });
});

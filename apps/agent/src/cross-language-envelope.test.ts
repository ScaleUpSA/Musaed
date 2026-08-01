import {
  createPublicKey,
  generateKeyPairSync,
  verify,
} from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { canonicalizeRunEnvelope } from "@musaed/contracts";
import { expect, it } from "vitest";

const claims = {
  runId: "run-cross-language",
  userId: "user-1",
  groupId: "group-1",
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  prompt: "Summarize the request",
  allowedModels: ["gpt-4o-mini"],
  workingDirectory: "/var/lib/musaed/runs/run-cross-language/workspace",
  agentDirectory: "/var/lib/musaed/runs/run-cross-language/agent",
  allowedTools: ["read"],
  approvalRequiredTools: [],
  litellmVirtualKey: "sk-virtual-run",
  "10": "ten",
  "9": "nine",
  "\u{10000}": "astral-key",
  "\u{e000}": "private-use-key",
  unicodeProbe: "😀\u0001",
  sandbox: {
    enabled: false,
    cpuLimitMillicores: 2_000,
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

it("verifies a Laravel-signed envelope in Node", () => {
  const keyPair = generateKeyPairSync("ed25519");
  const privateSeed = keyPair.privateKey
    .export({ format: "der", type: "pkcs8" })
    .subarray(-32);
  const publicKey = keyPair.publicKey
    .export({ format: "der", type: "spki" })
    .subarray(-32);
  const privateKey = Buffer.concat([privateSeed, publicKey]).toString("base64");
  const claimsJson = JSON.stringify(claims).replace(
    '"cpuLimitMillicores":2000',
    '"cpuLimitMillicores":2000.0',
  );
  const result = spawnSync("php", [
    "apps/web/tests/Fixtures/sign-envelope.php",
    claimsJson,
    privateKey,
  ], {
    cwd: resolve(process.cwd(), "../.."),
    env: {
      ...process.env,
      AGENT_ENVELOPE_PRIVATE_KEY: privateKey,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`PHP signer failed: ${result.stderr || result.stdout}`);
  }
  expect(result.stderr).toBe("");

  const envelope = JSON.parse(result.stdout) as typeof claims & { signature: string };
  expect(
    verify(
      null,
      Buffer.from(canonicalizeRunEnvelope(claims)),
      createPublicKey({
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          publicKey,
        ]),
        format: "der",
        type: "spki",
      }),
      Buffer.from(envelope.signature, "base64url"),
    ),
  ).toBe(true);
});

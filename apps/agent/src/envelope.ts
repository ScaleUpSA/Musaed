import { createPublicKey, verify } from "node:crypto";

import {
  canonicalizeRunEnvelope,
  type RunEnvelope,
} from "@musaed/contracts";

import type { AgentConfig } from "./config.js";

export class RunEnvelopePolicyError extends Error {
  readonly statusCode = 400;
  readonly code = "RUN_ENVELOPE_REJECTED";

  constructor() {
    super("Run envelope rejected");
    this.name = "RunEnvelopePolicyError";
  }
}

const decodePublicKey = (encoded: string): ReturnType<typeof createPublicKey> => {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("AGENT_ENVELOPE_PUBLIC_KEY must be a base64 Ed25519 public key");
  }

  return createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      key,
    ]),
    format: "der",
    type: "spki",
  });
};

const isRunEnvelope = (value: unknown): value is RunEnvelope => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const envelope = value as Partial<RunEnvelope>;
  return typeof envelope.signature === "string" && envelope.signature.length > 0;
};

export const verifyRunEnvelope = (
  value: unknown,
  config: AgentConfig,
  now = Date.now(),
): RunEnvelope => {
  if (!isRunEnvelope(value)) {
    throw new RunEnvelopePolicyError();
  }

  const { signature, ...claims } = value;
  if (!signature) {
    throw new RunEnvelopePolicyError();
  }

  let decodedSignature: Buffer;
  try {
    decodedSignature = Buffer.from(signature, "base64url");
  } catch {
    throw new RunEnvelopePolicyError();
  }

  if (decodedSignature.length !== 64) {
    throw new RunEnvelopePolicyError();
  }

  let valid = false;
  try {
    valid = verify(
      null,
      Buffer.from(canonicalizeRunEnvelope(claims)),
      decodePublicKey(config.envelopePublicKey),
      decodedSignature,
    );
  } catch {
    throw new RunEnvelopePolicyError();
  }

  if (!valid) {
    throw new RunEnvelopePolicyError();
  }

  const expiresAt = Date.parse(value.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt < now - config.envelopeClockSkewMs) {
    throw new RunEnvelopePolicyError();
  }

  return value;
};

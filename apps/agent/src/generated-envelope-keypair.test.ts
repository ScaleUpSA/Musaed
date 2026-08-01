import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { expect, it } from "vitest";

import type { AgentConfig } from "./config.js";
import { verifyRunEnvelope } from "./envelope.js";

const configFor = (publicKey: string): AgentConfig => ({
  port: 3001,
  agentRunRoot: "/tmp/musaed-runs",
  litellmUrl: "http://litellm:4000",
  envelopePublicKey: publicKey,
  envelopeClockSkewMs: 30_000,
  modelRequestTimeoutMs: 30_000,
});

const readEnvValue = (env: string, name: string): string => {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match?.[1]) {
    throw new Error(`${name} was not written`);
  }

  return match[1];
};

it("generates keys accepted by Laravel signing and agent verification", () => {
  const repositoryRoot = resolve(process.cwd(), "../..");
  const temporaryRoot = mkdtempSync(resolve(repositoryRoot, ".tmp-envelope-keypair-"));
  const temporaryRelative = relative(repositoryRoot, temporaryRoot);
  const scriptFromRoot = `${temporaryRelative}/scripts/generate-envelope-keypair.php`;

  try {
    mkdirSync(resolve(temporaryRoot, "scripts"));
    copyFileSync(
      resolve(repositoryRoot, "scripts/generate-envelope-keypair.php"),
      resolve(temporaryRoot, "scripts/generate-envelope-keypair.php"),
    );
    copyFileSync(resolve(repositoryRoot, ".env.example"), resolve(temporaryRoot, ".env.example"));

    const generate = spawnSync(
      "php",
      [scriptFromRoot, "--write"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    if (generate.status !== 0) {
      throw new Error(`Generator failed: ${generate.stderr || generate.stdout}`);
    }
    expect(generate.status).toBe(0);
    expect(generate.stderr).toBe("");

    const env = readFileSync(resolve(temporaryRoot, ".env"), "utf8");
    const privateKey = readEnvValue(env, "AGENT_ENVELOPE_PRIVATE_KEY");
    const publicKey = readEnvValue(env, "AGENT_ENVELOPE_PUBLIC_KEY");
    expect(Buffer.from(privateKey, "base64")).toHaveLength(64);
    expect(Buffer.from(publicKey, "base64")).toHaveLength(32);

    const claims = {
      runId: "generated-keypair-run",
      expiresAt: "2030-01-01T00:00:00.000Z",
    };
    const signed = spawnSync(
      "php",
      ["apps/web/tests/Fixtures/sign-envelope.php", JSON.stringify(claims), privateKey],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    expect(signed.status).toBe(0);
    expect(signed.stderr).toBe("");

    const envelope = JSON.parse(signed.stdout) as typeof claims & { signature: string };
    expect(verifyRunEnvelope(envelope, configFor(publicKey), Date.parse("2029-01-01"))).toEqual(
      envelope,
    );

    writeFileSync(resolve(temporaryRoot, ".env"), `${env.trim()}\n`);
    const overwrite = spawnSync(
      "php",
      [scriptFromRoot, "--write"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain("Refusing to overwrite");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

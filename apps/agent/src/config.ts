export interface AgentConfig {
  port: number;
  agentRunRoot: string;
  litellmUrl: string;
  envelopePublicKey: string;
  envelopeClockSkewMs: number;
  modelRequestTimeoutMs: number;
}

const required = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const port = (env: NodeJS.ProcessEnv): number => {
  const value = Number(env.PORT ?? 3001);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return value;
};

export const loadAgentConfig = (env: NodeJS.ProcessEnv): AgentConfig => {
  const envelopePublicKey = env.AGENT_ENVELOPE_PUBLIC_KEY;
  if (!envelopePublicKey) {
    throw new Error("AGENT_ENVELOPE_PUBLIC_KEY is required");
  }
  const clockSkewSeconds = Number(env.AGENT_ENVELOPE_CLOCK_SKEW_SECONDS ?? 30);
  if (!Number.isInteger(clockSkewSeconds) || clockSkewSeconds < 0) {
    throw new Error("AGENT_ENVELOPE_CLOCK_SKEW_SECONDS must be a non-negative integer");
  }

  const litellmUrl = required(env, "LITELLM_URL");
  if (!URL.canParse(litellmUrl)) {
    throw new Error("LITELLM_URL must be a valid URL");
  }

  const modelRequestTimeoutMs = Number(env.MODEL_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isInteger(modelRequestTimeoutMs) || modelRequestTimeoutMs < 1) {
    throw new Error("MODEL_REQUEST_TIMEOUT_MS must be a positive integer");
  }

  return {
    port: port(env),
    agentRunRoot: required(env, "AGENT_RUN_ROOT"),
    litellmUrl,
    envelopePublicKey,
    envelopeClockSkewMs: clockSkewSeconds * 1000,
    modelRequestTimeoutMs,
  };
};

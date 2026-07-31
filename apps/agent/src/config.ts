export interface AgentConfig {
  port: number;
  agentRunRoot: string;
  litellmUrl: string;
  envelopePublicKey?: string;
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
  if (env.NODE_ENV === "production" && !envelopePublicKey) {
    throw new Error("AGENT_ENVELOPE_PUBLIC_KEY is required in production");
  }

  const litellmUrl = required(env, "LITELLM_URL");
  try {
    new URL(litellmUrl);
  } catch {
    throw new Error("LITELLM_URL must be a valid URL");
  }

  return {
    port: port(env),
    agentRunRoot: required(env, "AGENT_RUN_ROOT"),
    litellmUrl,
    envelopePublicKey,
  };
};

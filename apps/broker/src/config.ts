export interface BrokerConfig {
  port: number;
}

export const loadBrokerConfig = (env: NodeJS.ProcessEnv): BrokerConfig => {
  const port = Number(env.PORT ?? 3002);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return { port };
};

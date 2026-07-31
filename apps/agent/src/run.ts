import {
  DefaultResourceLoader,
  createAgentSession,
  ModelRuntime,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";

import type { RunEnvelope } from "@musaed/contracts";

export interface PreparedRun {
  runId: string;
  allowedModels: readonly string[];
  cwd: string;
  agentDir: string;
  status: "prepared";
}

export async function prepareRun(envelope: RunEnvelope): Promise<PreparedRun> {
  const modelRuntime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
  });
  modelRuntime.registerProvider("litellm", {
    api: "openai-completions",
    apiKey: envelope.litellmVirtualKey,
    baseUrl: process.env.LITELLM_URL ?? "http://litellm:4000",
    models: envelope.allowedModels.map((id) => ({
      id,
      name: id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 16_384,
    })),
  });
  const resourceLoader = new DefaultResourceLoader({
    cwd: envelope.workingDirectory,
    agentDir: envelope.agentDirectory,
    settingsManager: SettingsManager.inMemory(),
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();

  await createAgentSession({
    cwd: envelope.workingDirectory,
    agentDir: envelope.agentDirectory,
    modelRuntime,
    settingsManager: SettingsManager.inMemory(),
    resourceLoader,
    noTools: envelope.allowedTools.length === 0 ? "all" : undefined,
  });

  return {
    runId: envelope.runId,
    allowedModels: envelope.allowedModels,
    cwd: envelope.workingDirectory,
    agentDir: envelope.agentDirectory,
    status: "prepared",
  };
}

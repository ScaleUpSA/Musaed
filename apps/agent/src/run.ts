import {
  DefaultResourceLoader,
  createAgentSession,
  ModelRuntime,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { AgentEvent, RunEnvelope } from "@musaed/contracts";

import type { AgentConfig } from "./config.js";
import { streamModelResponse } from "./model-provider.js";

export interface PreparedRun {
  runId: string;
  allowedModels: readonly string[];
  cwd: string;
  agentDir: string;
  status: "prepared";
}

export class RunPathPolicyError extends Error {
  readonly statusCode = 400;
  readonly code: "RUN_PATH_OUTSIDE_ROOT" | "RUN_PATH_SYMLINK";

  constructor(
    code: "RUN_PATH_OUTSIDE_ROOT" | "RUN_PATH_SYMLINK",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "RunPathPolicyError";
  }
}

const isOutsideRoot = (root: string, candidate: string): boolean => {
  const candidateRelative = relative(root, candidate);
  return (
    isAbsolute(candidateRelative) ||
    candidateRelative === ".." ||
    candidateRelative.startsWith(`..${sep}`)
  );
};

const pathWithinRunRoot = async (path: string, runRoot: string): Promise<string> => {
  const root = resolve(runRoot);
  await mkdir(root, { recursive: true });
  const rootReal = await realpath(root);
  const candidate = resolve(path);

  if (isOutsideRoot(rootReal, candidate)) {
    throw new RunPathPolicyError(
      "RUN_PATH_OUTSIDE_ROOT",
      `Path must be inside AGENT_RUN_ROOT: ${path}`,
    );
  }

  await mkdir(candidate, { recursive: true });

  const segments = relative(rootReal, candidate).split(sep).filter(Boolean);
  let current = rootReal;
  for (const segment of segments) {
    current = resolve(current, segment);
    if ((await lstat(current)).isSymbolicLink()) {
      throw new RunPathPolicyError(
        "RUN_PATH_SYMLINK",
        `Path must not contain symlinks: ${path}`,
      );
    }
  }

  const candidateReal = await realpath(candidate);
  if (isOutsideRoot(rootReal, candidateReal)) {
    throw new RunPathPolicyError(
      "RUN_PATH_OUTSIDE_ROOT",
      `Path must be inside AGENT_RUN_ROOT: ${path}`,
    );
  }

  return candidateReal;
};

export async function prepareRun(
  envelope: RunEnvelope,
  config: AgentConfig,
): Promise<PreparedRun> {
  const workingDirectory = await pathWithinRunRoot(
    envelope.workingDirectory,
    config.agentRunRoot,
  );
  const agentDirectory = await pathWithinRunRoot(envelope.agentDirectory, config.agentRunRoot);
  const modelRuntime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
  });
  modelRuntime.registerProvider("litellm", {
    api: "openai-completions",
    apiKey: envelope.litellmVirtualKey,
    baseUrl: config.litellmUrl,
    models: [{
      id: envelope.modelName,
      name: envelope.modelName,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 16_384,
    }],
  });
  const resourceLoader = new DefaultResourceLoader({
    cwd: workingDirectory,
    agentDir: agentDirectory,
    settingsManager: SettingsManager.inMemory(),
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();

  // Until the policy hook lands, a non-empty allow-list is advisory only.
  const noTools = envelope.allowedTools.length === 0 ? "all" : undefined;
  await createAgentSession({
    cwd: workingDirectory,
    agentDir: agentDirectory,
    modelRuntime,
    settingsManager: SettingsManager.inMemory(),
    resourceLoader,
    ...(noTools === undefined ? {} : { noTools }),
  });

  return {
    runId: envelope.runId,
    allowedModels: envelope.allowedModels,
    cwd: workingDirectory,
    agentDir: agentDirectory,
    status: "prepared",
  };
}

export async function executeRun(
  envelope: RunEnvelope,
  config: AgentConfig,
  emit: (event: AgentEvent) => Promise<void>,
): Promise<void> {
  const at = () => new Date().toISOString();

  try {
    await prepareRun(envelope, config);
    await emit({ type: "run.started", runId: envelope.runId, at: at() });
    for await (const text of streamModelResponse(envelope, config)) {
      await emit({ type: "assistant.delta", runId: envelope.runId, text, at: at() });
    }
    await emit({ type: "run.completed", runId: envelope.runId, at: at() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model execution failed.";
    try {
      await emit({
        type: "run.failed",
        runId: envelope.runId,
        error: message,
        at: at(),
      });
    } catch {
      // The control plane may be unavailable while reporting the failure.
    }
  }
}

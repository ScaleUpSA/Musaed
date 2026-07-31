import {
  DefaultResourceLoader,
  createAgentSession,
  ModelRuntime,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { RunEnvelope } from "@musaed/contracts";

export interface PreparedRun {
  runId: string;
  allowedModels: readonly string[];
  cwd: string;
  agentDir: string;
  status: "prepared";
}

const runRoot = (): string => process.env.AGENT_RUN_ROOT ?? "/tmp/musaed-runs";

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const isOutsideRoot = (root: string, candidate: string): boolean => {
  const candidateRelative = relative(root, candidate);
  return (
    isAbsolute(candidateRelative) ||
    candidateRelative === ".." ||
    candidateRelative.startsWith(`..${sep}`)
  );
};

const pathWithinRunRoot = async (path: string): Promise<string> => {
  const root = resolve(runRoot());
  await mkdir(root, { recursive: true });
  const rootReal = await realpath(root);
  const candidate = resolve(path);
  const relativeCandidate = relative(rootReal, candidate);

  if (isOutsideRoot(rootReal, candidate)) {
    throw new Error(`Path must be inside AGENT_RUN_ROOT: ${path}`);
  }

  const segments = relativeCandidate === "" ? [] : relativeCandidate.split(sep);
  let current = rootReal;

  for (const segment of segments) {
    current = resolve(current, segment);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) {
        throw new Error(`Path must not contain symlinks: ${path}`);
      }
    } catch (error: unknown) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  await mkdir(candidate, { recursive: true });
  const candidateReal = await realpath(candidate);
  if (isOutsideRoot(rootReal, candidateReal)) {
    throw new Error(`Path must be inside AGENT_RUN_ROOT: ${path}`);
  }

  return candidateReal;
};

export async function prepareRun(envelope: RunEnvelope): Promise<PreparedRun> {
  const workingDirectory = await pathWithinRunRoot(envelope.workingDirectory);
  const agentDirectory = await pathWithinRunRoot(envelope.agentDirectory);
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

  await createAgentSession({
    cwd: workingDirectory,
    agentDir: agentDirectory,
    modelRuntime,
    settingsManager: SettingsManager.inMemory(),
    resourceLoader,
    noTools: envelope.allowedTools.length === 0 ? "all" : undefined,
  });

  return {
    runId: envelope.runId,
    allowedModels: envelope.allowedModels,
    cwd: workingDirectory,
    agentDir: agentDirectory,
    status: "prepared",
  };
}

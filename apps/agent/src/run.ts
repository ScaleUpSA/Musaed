import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { AgentEvent, RunEnvelope } from "@musaed/contracts";

import {
  createAgentRuntime,
  type AgentRuntime,
  type AgentRuntimeSummary,
} from "./agent-runtime.js";
import type { AgentConfig } from "./config.js";
import { RunEnvelopePolicyError } from "./envelope.js";

export interface PreparedRun {
  runtime: AgentRuntime;
  summary: AgentRuntimeSummary;
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
  if (!envelope.allowedModels.includes(envelope.modelAlias)) {
    throw new RunEnvelopePolicyError();
  }

  const workingDirectory = await pathWithinRunRoot(
    envelope.workingDirectory,
    config.agentRunRoot,
  );
  const agentDirectory = await pathWithinRunRoot(envelope.agentDirectory, config.agentRunRoot);
  const { runtime } = await createAgentRuntime({
    ...envelope,
    workingDirectory,
    agentDirectory,
  }, config);

  return {
    runtime,
    summary: {
      runId: envelope.runId,
      allowedModels: envelope.allowedModels,
      cwd: workingDirectory,
      agentDir: agentDirectory,
      status: "prepared",
    },
  };
}

export const closePreparedRun = async (prepared: PreparedRun): Promise<void> => {
  await prepared.runtime.close();
};

export async function executeRun(
  envelope: RunEnvelope,
  config: AgentConfig,
  emit: (event: AgentEvent) => Promise<void>,
): Promise<void> {
  const at = () => new Date().toISOString();
  let prepared: PreparedRun | undefined;

  try {
    prepared = await prepareRun(envelope, config);
    await emit({ type: "run.started", runId: envelope.runId, at: at() });
    let pendingEvents = Promise.resolve();
    const enqueue = (event: AgentEvent): void => {
      pendingEvents = pendingEvents.then(() => emit(event));
    };
    const outcome = await prepared.runtime.run(envelope.prompt, (event) => {
      if (event.type === "assistant.delta") {
        enqueue({ type: "assistant.delta", runId: envelope.runId, text: event.text, at: at() });
      } else if (event.type === "tool.called") {
        enqueue({ type: "tool.called", runId: envelope.runId, toolName: event.toolName, toolCallId: event.toolCallId, at: at() });
      } else if (event.type === "tool.completed") {
        enqueue({ type: "tool.completed", runId: envelope.runId, toolName: event.toolName, toolCallId: event.toolCallId, isError: event.isError, at: at() });
      } else {
        enqueue({ type: "tool.blocked", runId: envelope.runId, toolName: event.toolName, toolCallId: event.toolCallId, reason: event.reason, at: at() });
      }
    });
    await pendingEvents;
    if (outcome === "failed") {
      await emit({ type: "run.failed", runId: envelope.runId, error: "Run failed.", at: at() });
    } else {
      await emit({ type: "run.completed", runId: envelope.runId, at: at() });
    }
  } catch (error) {
    console.error("Run execution failed", error);
    try {
      await emit({
        type: "run.failed",
        runId: envelope.runId,
        error: "Run failed.",
        at: at(),
      });
    } catch {
      // The control plane may be unavailable while reporting the failure.
    }
  } finally {
    await prepared?.runtime.close();
  }
}

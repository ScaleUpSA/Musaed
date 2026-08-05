import {
  DefaultResourceLoader,
  createAgentSession,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";

import type { RunEnvelope } from "@musaed/contracts";

import type { AgentConfig } from "./config.js";
import { startFakeProvider } from "./fake-provider.js";

type RuntimeEvent =
  | { type: "assistant.delta"; text: string }
  | { type: "tool.called"; toolName: string; toolCallId: string }
  | { type: "tool.completed"; toolName: string; toolCallId: string; isError: boolean }
  | { type: "tool.blocked"; toolName: string; toolCallId: string; reason: string };

export type RuntimeOutcome = "completed" | "failed";

export interface AgentRuntime {
  run(prompt: string, emit: (event: RuntimeEvent) => void): Promise<RuntimeOutcome>;
  close(): Promise<void>;
}

export interface AgentRuntimeSummary {
  runId: string;
  allowedModels: readonly string[];
  cwd: string;
  agentDir: string;
  status: "prepared";
}

const blockReason = (toolName: string): string =>
  `Tool ${toolName} is outside the run tool allow-list.`;

export const createAgentRuntime = async (
  envelope: RunEnvelope,
  config: AgentConfig,
): Promise<{ runtime: AgentRuntime; summary: AgentRuntimeSummary }> => {
  const fakeProvider = envelope.modelImplementation === "fake"
    ? await startFakeProvider()
    : undefined;
  try {
    const modelRuntime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(),
      modelsPath: null,
    });
    modelRuntime.registerProvider("litellm", {
      api: "openai-completions",
      apiKey: envelope.litellmVirtualKey,
      baseUrl: fakeProvider?.baseUrl ?? config.litellmUrl,
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
    const model = modelRuntime.getModel("litellm", envelope.modelName);
    if (model === undefined) {
      throw new Error("Configured run model is unavailable");
    }
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
    const { session } = await createAgentSession({
      cwd: envelope.workingDirectory,
      agentDir: envelope.agentDirectory,
      modelRuntime,
      model,
      settingsManager: SettingsManager.inMemory(),
      sessionManager: SessionManager.inMemory(),
      resourceLoader,
      tools: envelope.allowedTools,
    });
    const runtime: AgentRuntime = {
      async run(prompt, emit) {
        let stopReason: string | undefined;
        const blockedToolCalls = new Set<string>();
        const authorize = (toolName: string, toolCallId: string): boolean => {
          if (envelope.allowedTools.includes(toolName)) {
            return true;
          }
          if (!blockedToolCalls.has(toolCallId)) {
            blockedToolCalls.add(toolCallId);
            emit({
              type: "tool.blocked",
              toolName,
              toolCallId,
              reason: blockReason(toolName),
            });
          }
          return false;
        };
        const unsubscribe = session.subscribe((event) => {
          if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
            emit({ type: "assistant.delta", text: event.assistantMessageEvent.delta });
          } else if (
            event.type === "message_update" &&
            event.assistantMessageEvent.type === "toolcall_end"
          ) {
            authorize(
              event.assistantMessageEvent.toolCall.name,
              event.assistantMessageEvent.toolCall.id,
            );
          } else if (event.type === "tool_execution_start") {
            if (authorize(event.toolName, event.toolCallId)) {
              emit({ type: "tool.called", toolName: event.toolName, toolCallId: event.toolCallId });
            }
          } else if (event.type === "tool_execution_end") {
            if (blockedToolCalls.has(event.toolCallId)) {
              return;
            }
            emit({
              type: "tool.completed",
              toolName: event.toolName,
              toolCallId: event.toolCallId,
              isError: event.isError || blockedToolCalls.has(event.toolCallId),
            });
          } else if (event.type === "agent_end") {
            stopReason = [...event.messages]
              .reverse()
              .find((message) => message.role === "assistant")?.stopReason;
          }
        });
        session.agent.beforeToolCall = async ({ toolCall }) => {
          if (authorize(toolCall.name, toolCall.id)) {
            return undefined;
          }
          return { block: true, reason: blockReason(toolCall.name) };
        };
        try {
          await session.prompt(prompt);
          await session.waitForIdle();
          return stopReason === "aborted" || stopReason === "error" ? "failed" : "completed";
        } finally {
          unsubscribe();
        }
      },
      async close() {
        await session.waitForIdle();
        await fakeProvider?.close();
      },
    };
    return {
      runtime,
      summary: {
        runId: envelope.runId,
        allowedModels: envelope.allowedModels,
        cwd: envelope.workingDirectory,
        agentDir: envelope.agentDirectory,
        status: "prepared",
      },
    };
  } catch (error) {
    await fakeProvider?.close();
    throw error;
  }
};

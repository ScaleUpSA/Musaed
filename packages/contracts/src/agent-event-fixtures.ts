import type { AgentEvent } from "./index.js";

export const agentEventFixtures = [
  { type: "run.started", runId: "run-1", at: "2030-01-01T00:00:00.000Z" },
  {
    type: "assistant.delta",
    runId: "run-1",
    text: "Hello world",
    at: "2030-01-01T00:00:01.000Z",
  },
  {
    type: "tool.called",
    runId: "run-1",
    toolName: "read",
    toolCallId: "tool-call-1",
    at: "2030-01-01T00:00:02.000Z",
  },
  {
    type: "tool.completed",
    runId: "run-1",
    toolName: "read",
    toolCallId: "tool-call-1",
    isError: false,
    at: "2030-01-01T00:00:03.000Z",
  },
  { type: "run.completed", runId: "run-1", at: "2030-01-01T00:00:04.000Z" },
  {
    type: "run.failed",
    runId: "run-1",
    error: "Model provider is unavailable.",
    at: "2030-01-01T00:00:05.000Z",
  },
] as const satisfies readonly AgentEvent[];

import type { RunEnvelope } from "@musaed/contracts";

import type { AgentConfig } from "./config.js";
import { completeFakeResponse } from "./fake-provider.js";

export class ModelProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelProviderError";
  }
}

const providerError = (status: number): Error => {
  if (status === 429) {
    return new ModelProviderError("Model provider rate limit reached.");
  }

  return new ModelProviderError(`Model provider request failed (${status}).`);
};

const streamedText = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null || !("choices" in value) || !Array.isArray(value.choices)) {
    return null;
  }

  const choice = value.choices[0];
  if (typeof choice !== "object" || choice === null || !("delta" in choice) || typeof choice.delta !== "object" || choice.delta === null || !("content" in choice.delta)) {
    return null;
  }

  return typeof choice.delta.content === "string" ? choice.delta.content : null;
};

async function* streamLiteLlmResponse(
  envelope: RunEnvelope,
  config: AgentConfig,
): AsyncIterable<string> {
  let response: Response;
  try {
    response = await fetch(`${config.litellmUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${envelope.litellmVirtualKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envelope.modelName,
        messages: [{ role: "user", content: envelope.prompt }],
        stream: true,
      }),
      signal: AbortSignal.timeout(config.modelRequestTimeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ModelProviderError("Model provider timed out.");
    }

    throw new ModelProviderError("Model provider is unavailable.");
  }

  if (!response.ok || response.body === null) {
    throw providerError(response.status);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += value ?? "";
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          completed = true;
          break;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(data);
        } catch {
          throw new ModelProviderError("Model provider returned invalid streaming data.");
        }

        const text = streamedText(payload);
        if (text !== null) {
          yield text;
        }
      }

      if (completed) {
        return;
      }

      if (done) {
        throw new ModelProviderError("Model provider stream ended before completion.");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamModelResponse(
  envelope: RunEnvelope,
  config: AgentConfig,
): AsyncIterable<string> {
  if (envelope.modelImplementation === "fake") {
    yield* completeFakeResponse(envelope.prompt);
    return;
  }

  yield* streamLiteLlmResponse(envelope, config);
}

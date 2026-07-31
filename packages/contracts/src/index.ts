import { Type, type Static } from "@sinclair/typebox";

export type RunId = string;

const nonEmptyString = () => Type.String({ minLength: 1 });

const runEnvelopeProperties = {
    runId: nonEmptyString(),
    userId: nonEmptyString(),
    groupId: nonEmptyString(),
    workspaceId: nonEmptyString(),
    conversationId: nonEmptyString(),
    prompt: Type.Optional(nonEmptyString()),
    allowedModels: Type.Array(nonEmptyString(), { minItems: 1 }),
    workingDirectory: nonEmptyString(),
    agentDirectory: nonEmptyString(),
    allowedTools: Type.Array(nonEmptyString()),
    approvalRequiredTools: Type.Array(nonEmptyString()),
    litellmVirtualKey: nonEmptyString(),
    sandbox: Type.Object(
      {
        enabled: Type.Boolean(),
        cpuLimitMillicores: Type.Integer({ exclusiveMinimum: 0 }),
        memoryLimitMb: Type.Integer({ exclusiveMinimum: 0 }),
        pidsLimit: Type.Integer({ exclusiveMinimum: 0 }),
      },
      { additionalProperties: false },
    ),
    callbacks: Type.Object(
      {
        eventsUrl: nonEmptyString(),
        auditUrl: nonEmptyString(),
        approvalsUrl: nonEmptyString(),
        callbackToken: nonEmptyString(),
      },
      { additionalProperties: false },
    ),
    policyVersion: nonEmptyString(),
    expiresAt: Type.String({ format: "date-time" }),
};

export const RunEnvelopeSchema = Type.Object(
  { ...runEnvelopeProperties, signature: nonEmptyString() },
  { additionalProperties: false },
);

export const RunEnvelopeRequestSchema = Type.Object(
  { ...runEnvelopeProperties, signature: Type.Optional(Type.String()) },
  { additionalProperties: false },
);

export type RunEnvelope = Static<typeof RunEnvelopeSchema>;

const compareUtf8Bytes = (left: string, right: string): number => {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) {
      return leftBytes[index] - rightBytes[index];
    }
  }

  return leftBytes.length - rightBytes.length;
};

export const canonicalizeJson = (value: unknown): string => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new TypeError("Canonical JSON can contain only integer numbers");
    }

    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareUtf8Bytes(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalizeJson(entry)}`);

    return `{${entries.join(",")}}`;
  }

  throw new TypeError("Canonical JSON cannot contain this value");
};

export const canonicalizeRunEnvelope = (
  envelope: Omit<RunEnvelope, "signature">,
): string => canonicalizeJson(envelope);

export const SandboxRequestSchema = Type.Object(
  {
    runId: nonEmptyString(),
    image: nonEmptyString(),
    cpuLimitMillicores: Type.Integer({ exclusiveMinimum: 0, maximum: 64_000 }),
    memoryLimitMb: Type.Number({ exclusiveMinimum: 16, maximum: 65_536 }),
  },
  { additionalProperties: false },
);

export type SandboxRequest = Static<typeof SandboxRequestSchema>;

export type AgentEvent =
  | {
      type: "run.started";
      runId: RunId;
      at: string;
    }
  | {
      type: "assistant.delta";
      runId: RunId;
      text: string;
      at: string;
    }
  | {
      type: "tool.called";
      runId: RunId;
      toolName: string;
      toolCallId: string;
      at: string;
    }
  | {
      type: "tool.completed";
      runId: RunId;
      toolName: string;
      toolCallId: string;
      isError: boolean;
      at: string;
    }
  | {
      type: "run.completed";
      runId: RunId;
      at: string;
    }
  | {
      type: "run.failed";
      runId: RunId;
      error: string;
      at: string;
    };

export type ToolPolicyDecision =
  | {
      decision: "allow";
      reason?: string;
    }
  | {
      decision: "deny";
      reason: string;
    }
  | {
      decision: "require_approval";
      reason: string;
    };

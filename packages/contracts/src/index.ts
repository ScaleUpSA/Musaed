import { Type, type Static } from "@sinclair/typebox";

export type RunId = string;

const nonEmptyString = () => Type.String({ minLength: 1 });

export const RunEnvelopeSchema = Type.Object(
  {
    runId: nonEmptyString(),
    userId: nonEmptyString(),
    groupId: nonEmptyString(),
    workspaceId: nonEmptyString(),
    conversationId: nonEmptyString(),
    allowedModels: Type.Array(nonEmptyString(), { minItems: 1 }),
    workingDirectory: nonEmptyString(),
    agentDirectory: nonEmptyString(),
    allowedTools: Type.Array(nonEmptyString()),
    approvalRequiredTools: Type.Array(nonEmptyString()),
    litellmVirtualKey: nonEmptyString(),
    sandbox: Type.Object(
      {
        enabled: Type.Boolean(),
        cpuLimit: Type.Number({ exclusiveMinimum: 0 }),
        memoryLimitMb: Type.Number({ exclusiveMinimum: 0 }),
        pidsLimit: Type.Integer({ exclusiveMinimum: 0 }),
      },
      { additionalProperties: false },
    ),
    callbacks: Type.Object(
      {
        eventsUrl: nonEmptyString(),
        auditUrl: nonEmptyString(),
        approvalsUrl: nonEmptyString(),
      },
      { additionalProperties: false },
    ),
    policyVersion: nonEmptyString(),
    expiresAt: Type.String({ format: "date-time" }),
    signature: nonEmptyString(),
  },
  { additionalProperties: false },
);

export type RunEnvelope = Static<typeof RunEnvelopeSchema>;

export const SandboxRequestSchema = Type.Object(
  {
    runId: nonEmptyString(),
    image: nonEmptyString(),
    cpuLimit: Type.Number({ exclusiveMinimum: 0, maximum: 64 }),
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

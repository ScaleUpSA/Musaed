export type RunId = string;

export interface RunEnvelope {
  runId: RunId;
  userId: string;
  groupId: string;
  workspaceId: string;
  conversationId: string;
  allowedModels: readonly string[];
  workingDirectory: string;
  agentDirectory: string;
  allowedTools: readonly string[];
  approvalRequiredTools: readonly string[];
  litellmVirtualKey: string;
  sandbox: {
    enabled: boolean;
    cpuLimit: number;
    memoryLimitMb: number;
    pidsLimit: number;
  };
  callbacks: {
    eventsUrl: string;
    auditUrl: string;
    approvalsUrl: string;
  };
  policyVersion: string;
  expiresAt: string;
  signature: string;
}

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

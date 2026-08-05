# ADR 0010: Drive the pi loop and enforce envelope tool authority

## Status

Accepted.

## Context

The agent runtime previously created a pi session and then bypassed it by streaming model output directly. Tools therefore could not execute, and a non-empty envelope allow-list was advisory.

Pi 0.83.0 exposes named tool selection and a pre-execution tool hook, but it does not provide defer, suspend, or resume semantics for an approval decision.

## Decision

The runtime drives one pi 0.83.0 `AgentSession` per run and translates its event stream into Musaed agent events. Tool authority is enforced twice: the signed envelope is passed as pi's `tools` allow-list, and a runtime authorisation hook blocks calls outside that allow-list. Blocks are persisted as visible `tool.blocked` events.

The placeholder model uses an in-process OpenAI-compatible SSE endpoint through the same pi loop and event translation path as LiteLLM.

Approval-required tool calls remain Musaed-owned. Slice C will build the suspended-run and approval semantics around pi rather than treating a blocked tool result as approval support.

## Consequences

- Allowed tools execute through the real pi loop and produce auditable lifecycle events.
- A model-directed call outside the envelope cannot execute, even if it is attempted.
- Placeholder runs exercise the same loop and tool policy as provider-backed runs.
- Pi 0.83.0 cannot defer or suspend a turn, so approval state and resumption are not provided by the SDK.

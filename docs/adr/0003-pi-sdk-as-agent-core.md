# 3. pi SDK as the agent core

Date: 2026-07-31 · Status: accepted

## Context

We need an agent loop: model calls, tool dispatch, streaming, context management, cancellation, compaction. Writing one is months of work and permanently ours to maintain.

The [pi SDK](https://github.com/earendil-works/pi) (`@earendil-works/pi-coding-agent`, MIT) provides all of it. A source audit at commit `ea781d6` established the facts that matter:

- Sessions are instance-owned — one process can host many concurrent runs, provided every file-backed default is replaced with an explicit per-run object.
- Providers and credentials can be injected programmatically. No environment variable, no `auth.json`.
- `tool_call` hooks genuinely block execution, including `bash`. That is a policy engine we would otherwise build.
- Being a *coding* agent is an advantage, not a mismatch: artifact generation is the agent writing `python-pptx` in a sandbox.
- Gondolin demonstrates the pattern for routing built-in tools into a VM — which is exactly our container story.

Against it: 0.x with real API churn (39 commits to `agent-session.ts` in 60 days), no native MCP support, no sandbox of its own, and a `SessionManager` that is a concrete class rather than a storage interface.

Project health is nonetheless strong — 5,255 commits, 273 contributors, 872 commits in the last 60 days.

## Decision

Adopt pi as the agent core, pinned to an exact version, behind our own `AgentRuntime` interface. Upgrades are deliberate and reviewed.

## Consequences

Months of loop, streaming and hook work avoided, and the policy hooks are better than what we would have written.

The `AgentRuntime` abstraction costs a little indirection and must be maintained honestly — the moment pi types leak across it, the escape hatch is gone.

MCP is ours to add (via the community adapter or our own client) rather than free. Sandboxing is ours entirely. Run events persist at the application layer because pi's storage is not a pluggable backend.

Version pinning means dependabot noise and periodic deliberate upgrades. Accepted.

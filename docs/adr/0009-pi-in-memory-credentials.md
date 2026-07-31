# ADR 0009: Use pi-ai's in-memory credential store

## Status

Accepted for the scaffold; envelope verification remains a Phase 1 follow-up.

## Context

The public `@earendil-works/pi-coding-agent@0.83.0` package does not export
the coding-agent package's internal `AuthStorage` class. Its changelog directs
SDK consumers to inject a `pi-ai` `CredentialStore` instead. The pi source
provides `InMemoryCredentialStore` from `@earendil-works/pi-ai`.

## Decision

The agent creates each `ModelRuntime` with a fresh `InMemoryCredentialStore`
and `modelsPath: null`. It registers the run's LiteLLM virtual key only in the
runtime provider configuration. It must never rely on the default file-backed
store, which would read `~/.pi/agent/auth.json`.

The current `/runs/prepare` endpoint remains an intentionally incomplete
authority boundary: it validates the envelope shape but does not yet verify
its signature. Production startup therefore fails unless
`AGENT_ENVELOPE_PUBLIC_KEY` is configured.

## Consequences

- The exact internal `AuthStorage.inMemory()` API cannot be used through the
  pinned public package export.
- `InMemoryCredentialStore` is the supported public equivalent for this
  version.
- Signature verification must be implemented before the agent endpoint is
  exposed in production.

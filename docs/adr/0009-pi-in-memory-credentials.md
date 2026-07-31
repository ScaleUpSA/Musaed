# ADR 0009: Use pi-ai's in-memory credential store

## Status

Accepted.

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

## Consequences

- The exact internal `AuthStorage.inMemory()` API cannot be used through the
  pinned public package export.
- `InMemoryCredentialStore` is the supported public equivalent for this
  version.
- Envelope verification is unconditional: the runtime requires
  `AGENT_ENVELOPE_PUBLIC_KEY` in every environment and verifies the Ed25519
  signature before constructing a pi session.

## Envelope signing and canonical form

Laravel holds the Ed25519 private key in `AGENT_ENVELOPE_PRIVATE_KEY`.
The agent receives only the corresponding raw public key through
`AGENT_ENVELOPE_PUBLIC_KEY`. Both values are base64-encoded raw key material;
the private key is control-plane custody only and is never sent to the runtime.

The signed bytes are canonical JSON of the envelope without `signature`:

- object keys are sorted lexicographically by their UTF-8 key bytes at every
  object level;
- arrays retain their order;
- JSON is compact UTF-8 with Unicode and `/` left unescaped;
- strings, booleans, null and finite numbers use their standard JSON encoding.

The same canonicalizer is implemented in PHP and TypeScript, and the
cross-language test verifies Laravel output with Node's Ed25519 verifier.
The signature is base64url without padding.

Envelopes expire after the configured
`RUN_ENVELOPE_LIFETIME_SECONDS` (five minutes by default). The agent allows a
configured 30-second clock skew via `AGENT_ENVELOPE_CLOCK_SKEW_SECONDS`, then
rejects expired envelopes with the same `RUN_ENVELOPE_REJECTED` policy error
used for missing, malformed or invalid signatures.

# 2. Laravel control plane, Node agent runtime

Date: 2026-07-31 · Status: accepted

## Context

The system has two halves with genuinely different shapes. The control plane is auth, RBAC, policy, catalogue CRUD, queues, audit and an admin UI — conventional web application work, most of the codebase by volume. The agent runtime is a long-lived streaming tool loop driving the pi SDK, MCP clients and browser automation.

The agent runtime must be Node/TypeScript: pi is TypeScript, the MCP SDK is TypeScript, Playwright is TypeScript. That is not a choice. Artifact generation is Python (python-pptx, LibreOffice) inside a container. **This system is polyglot regardless of what we pick**, so the real question is not "PHP or TypeScript" but "one language or two".

An all-TypeScript stack would give unified types, one runtime, and a larger contributor pool for an AI project. Against that: Laravel supplies auth, policies, migrations, queues, validation, audit and admin scaffolding that would otherwise be assembled from five libraries and thirty decisions — and it is what the team building this actually ships in.

## Decision

Laravel is the control plane and system of record. A separate Node 24 service is the agent runtime. They communicate over an internal HTTP contract carrying a signed, short-lived run envelope. Node is never embedded in PHP, and PHP never drives the tool loop.

## Consequences

Two toolchains, two test frameworks, and a serialisation boundary to maintain — mitigated by generating/sharing types through `packages/contracts`.

The boundary is not accidental complexity: it is the authority/executor split the security model requires. Making it a process and language boundary makes it hard to violate by accident.

A smaller pool of contributors than an all-TypeScript project would attract. Accepted deliberately: this is built because ScaleUp needs it, not to maximise stars. If broad adoption ever becomes the goal, this is the ADR to revisit — and it must be revisited early, not after the control plane is written.

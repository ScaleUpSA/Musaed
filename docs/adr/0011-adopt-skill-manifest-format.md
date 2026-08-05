# 11. Adopt the skill manifest format

Date: 2026-08-05 · Status: accepted

## Context

The company-context library needs a small, inspectable format for reusable
instructions. Cloudflare OS uses Markdown files named `SKILL.md` with YAML
frontmatter. In
`/home/ubuntu/research/cloudflare-os/packages/gatekeeper-context/src/agent-skill.ts`,
the parser requires the final path segment to be `SKILL.md`, validates
`name` and `description`, and constrains names with:

> `^[a-z0-9]+(?:-[a-z0-9]+)*$`

The same source limits names to 64 characters and descriptions to 1024
characters. It wraps the body as:

> `<agent_skill> ... </agent_skill>`

Most importantly, the model-facing catalogue is discovery metadata, not
authority. Cloudflare's
`/home/ubuntu/research/cloudflare-os/AGENTS.md` says:

> “a tool the server declares `readOnlyHint: true` runs as an observation”

and describes catalogues as bounded, untrusted discovery data. The relevant
catalogue implementation is
`/home/ubuntu/research/cloudflare-os/packages/gatekeeper-context/src/agent-skill.ts`.

Musaed already uses `SKILL.md` for repository tooling, so adopting the same
shape for company context is a small, legible step.

## Decision

Use `SKILL.md` for company-context skills:

- YAML frontmatter is required;
- frontmatter contains `name` and `description`;
- names use lowercase letters, numbers, and single hyphens;
- name and description length limits are enforced;
- the Markdown body is the instruction;
- the catalogue shown to a model is size-capped, untrusted discovery
  metadata and carries no authority;
- reading the skill remains a separate governed operation.

This ADR adopts the format and trust distinction only. It does not copy
Cloudflare code, adopt Workers storage, or add a Gatekeeper abstraction.

## Consequences

Skills are easy to review, diff, import, and explain to administrators.
Existing repository tooling provides a familiar convention.

The parser and catalogue need explicit size and schema validation. A catalogue
entry can suggest what exists but cannot grant access; the control plane and
tool boundary remain authoritative.

The format does not solve retrieval quality, memory, or policy enforcement.
Cloudflare's source uses lexical scoring in
`packages/gatekeeper-context/src/context-collection.ts:596-632`, not embeddings.
Our first retrieval implementation should therefore follow the existing
no-vector-database rule and use PostgreSQL full-text search rather than
introducing pgvector for this feature.

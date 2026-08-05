# ADR 0011: Adopt the skill manifest format

## Status

Accepted.

## Context

The company-context library needs a small, inspectable format for reusable
instructions. The study used local read-only clones of
`cloudflare/cloudflare-os` and `cloudflare/cloudflare-os-starter`. The
standalone clone was at commit
`e1ab8fbd4f609aff7ede9d490bafe1bcf9b2a682`; the starter pins its
`cloudflare-os` submodule to `bf7f762d7fa73553284d731ab6a978d3ea17be24`.

Cloudflare OS uses Markdown files named `SKILL.md` with YAML frontmatter. In
`cloudflare/cloudflare-os:packages/gatekeeper-context/src/agent-skill.ts:72-87`,
the parser validates `name` and `description`, requires the final path segment
to be `SKILL.md`, and constrains names with:

> `^[a-z0-9]+(?:-[a-z0-9]+)*$`

The same source limits names to 64 characters and descriptions to 1024
characters
(`cloudflare/cloudflare-os:packages/gatekeeper-context/src/agent-skill.ts:72-83`).
The parser wraps the body in an `agent_skill` element
(`cloudflare/cloudflare-os:packages/gatekeeper-context/src/agent-skill.ts:68`).

The model-facing catalogue is a separate concern. The gatekeeper contract
states:

> “shown to the agent as untrusted data, so entries carry no authority and are
> size-capped.”

Source: `cloudflare/cloudflare-os:packages/workshop-shared/src/gatekeeper.ts:79-82`.
The same file defines hard catalogue caps because it is injected into the
agent context as untrusted data
(`cloudflare/cloudflare-os:packages/workshop-shared/src/gatekeeper.ts:108-113`).

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
`cloudflare/cloudflare-os:packages/gatekeeper-context/src/context-collection.ts:596-632`,
not embeddings. Our first retrieval implementation should therefore follow
the existing no-vector-database rule and use PostgreSQL full-text search
rather than introducing pgvector for this feature.

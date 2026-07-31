# Roadmap

Sequenced so that the riskiest unknown is proven first and something demonstrable exists early. Durations assume two developers and are estimates, not commitments.

## Phase 1 — Prove the spine (≈2 weeks)

The only genuinely novel piece: Laravel mints a run envelope → the Node runtime builds an isolated pi session → events stream to React → a policy hook blocks a tool → a sandbox executes it. Thin, ugly, end-to-end.

Proof points: per-run pi isolation works; a provider key can be injected programmatically; `{ block: true }` really prevents execution; cancellation tears down cleanly; brokered container exec works without a socket; we know what a concurrent run costs in RAM and CPU.

**Backlog:** [`backlog/phase-1.md`](backlog/phase-1.md)

## Phase 2 — Governed chat (≈6 weeks)

Auth, users, groups, model catalogue and aliases, LiteLLM wiring, conversations, streaming chat UI, audit trail, admin console v1. Plus the **evaluation harness** — pulled forward from much later, because cheap models mean frequent swaps and invisible regressions.

Exit: ten employees use it daily instead of free ChatGPT.

## Phase 3 — Memory (≈4 weeks)

pgvector schema, extraction and retrieval, per-user and per-org scoping, a UI where a user can see and delete what is remembered about them, admin revocation, audit.

Exit: memory is useful, and it is *governed* — visible, scoped, revocable.

## Phase 4 — Artifacts (≈6 weeks)

PPTX, DOCX, XLSX, PDF generated in the sandbox via python-pptx/openpyxl/LibreOffice. Templates and brand assets. Artifact storage, versioning, preview and download. Golden-file tests.

Exit: an employee asks for a deck and gets one worth sending.

## Phase 5 — Computer use (≈6 weeks)

The full sandbox story: broker hardening, the browser image, noVNC live view and human takeover, CDP automation, egress allow-list, idle expiry, reconciler, artifact export.

Exit: an employee watches the agent work in a browser and takes over mid-task.

## Phase 6 — MCP control plane (≈5 weeks)

Server catalogue, per-group tool allow-lists, approval workflow for sensitive calls, isolated MCP execution, full call audit.

Exit: an admin adds an MCP server, grants it to one group, and every call is logged and approvable.

## Phase 7 — Release readiness (≈4 weeks, overlapping)

One-command install, `.env.example` that works, seeded demo, upgrade and migration path, backup guidance, `CONTRIBUTING.md`, `SECURITY.md`, issue templates, SBOM and notice inventory, Arabic/RTL pass, release notes, a demo video.

Exit: a stranger can run it in ten minutes.

## Approximately

Eight to eleven months for two developers to a credible v1. Phases 3–6 can partly run in parallel once Phase 2 sets the conventions — but **not before**, or you get four incompatible interpretations of the same design.

The one sequencing opinion worth arguing about: do not ship governed chat alone and hope people wait. Pull a thin slice of artifacts or computer use forward into the launch, because that is the part nobody else has.

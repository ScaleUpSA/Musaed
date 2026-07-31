# Working in this repository

Conventions for humans and coding agents. Read [`docs/architecture.md`](docs/architecture.md) and [`docs/security-model.md`](docs/security-model.md) before your first change; the ADRs in [`docs/adr/`](docs/adr/) explain why things are the way they are.

## Layout

```
apps/web       Laravel + Inertia + React + TypeScript — control plane, system of record
apps/agent     Node 24 + TypeScript + pi SDK — agent runtime, executor only
apps/broker    Node 24 + TypeScript — sandbox container lifecycle
packages/contracts   Shared TS types: run envelope, agent events, policy decisions
docker/        Compose stack
docs/          Architecture, security model, ADRs, roadmap, backlog
```

## Invariants

Violating one of these is a security bug, not a style disagreement. They are listed in full in `docs/security-model.md`; the short form:

- **No provider API key in `apps/agent`, a sandbox, or the browser.** Keys live in the control plane and LiteLLM. Runs get a short-lived virtual key from the envelope.
- **Never mount a Docker/Podman socket** into anything that runs agent, model-directed or user code. Only `apps/broker` talks to Podman.
- **Construct pi sessions per-run, explicitly**: `cwd`, `agentDir`, `AuthStorage.inMemory()`, `SettingsManager.inMemory()`, `modelsPath: null`, discovery disabled. Never touch `~/.pi`.
- **Environment variables are not an isolation mechanism** — they are process-global. In particular, do not use `PI_CODING_AGENT_DIR` per request.
- **Authorise twice**: the envelope limits what the runtime knows about, and a `tool_call` hook blocks anything outside it. `user_bash` is a separate path and needs its own check.
- **Model output is untrusted input.** Tool arguments may have been written by a prompt injection.
- **Sandbox egress is deny-by-default.**

## Conventions

### Code style

- Prefer simple, skimmable code over clever code.
- Keep implementations short and reduce indirection; do not add abstractions before they are earned.
- Return early when a condition is settled.
- Minimise representable states and keep argument lists short.
- Do not add optional or override parameters unless the value is truly optional.
- Use discriminated unions for variants and handle every variant exhaustively.
- Trust internal types, but validate every external boundary: HTTP, environment, database, and files.
- Assert when a missing value means the deployment is misconfigured; do not silently default it.
- Do not add `try`/`catch` without a real recovery path.

**Laravel (`apps/web`).** Standard Laravel layout; actions for non-trivial business logic; form requests for validation; policies for authorisation — never inline `if ($user->role === ...)`. Migrations are never edited after being merged. Pest for tests, Pint for formatting. Every user-visible string is translatable; the UI must work in Arabic and RTL, so use logical CSS properties (`ps-*`/`pe-*`, `ms-*`/`me-*`), never `pl-*`/`pr-*`.

**React (`apps/web/resources/js`).** TypeScript, no `any`. Inertia pages under `pages/`, shared UI under `components/`. Page state comes through Inertia props; run events come over the event stream — don't mix the two.

**Node services (`apps/agent`, `apps/broker`).** Strict TypeScript, no `any`, no `as` to paper over a type. Fastify. Shared types come from `packages/contracts` — if the two halves of the system disagree about a shape, fix the contract, don't cast. Vitest.

**pi SDK.** Pinned to an exact version; upgrades are deliberate and reviewed, because the API moves fast. Keep pi behind our own `AgentRuntime` abstraction so it stays replaceable. When you need a real signature, read the source at `/home/ubuntu/repos/pi` rather than guessing.

**Commits.** Conventional commits. Small, logically-scoped, with the test in the same commit as the behaviour.

## Verifying your work

Run these before you call anything finished:

```bash
# apps/web
php artisan test
./vendor/bin/pint --test

# TypeScript workspaces
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

If you touched the compose stack, confirm `docker compose -f docker/compose.yml up` still comes up clean from a fresh `.env.example`.

## Things not to do

- Don't add employee-facing BYOK, model pickers, or MCP installation. That is deliberately not this product.
- Don't introduce a vector database. pgvector until measurement says otherwise.
- Don't add cross-organisation multi-tenancy. Each org self-hosts.
- Don't copy code from Open WebUI (branding/licence restrictions), Dify (source-available licence), or Kasm images. MIT/Apache/BSD sources only — this project is MIT.
- Don't treat pi's `SessionManager` as a pluggable storage backend. Persist run events at the application layer.

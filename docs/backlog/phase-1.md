# Phase 1 backlog — prove the spine

Each item is one pull request, with acceptance criteria that can be verified without judgement. Order matters: 1–4 are sequential, 5–9 mostly parallel once the contract exists.

The goal is a thin end-to-end slice, not a good product. Ugly is fine. Unproven is not.

---

## 1. Monorepo scaffold

Workspace layout, toolchains, `docker compose up`, CI.

**Done when:** a clean checkout runs `php artisan test`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` and `docker compose -f docker/compose.yml up` successfully; CI runs all of them on push.

**Follow-up:** Revisit the Laravel 12 baseline when the React starter kit supports Laravel 13.

## 2. Run envelope contract

Define the envelope and event stream in `packages/contracts`: run/user/group identity, policy version, allowed models, tool allow-list, approval-required set, LiteLLM virtual key, sandbox entitlement, callbacks, expiry.

**Done when:** both Node services import the types; a Laravel-side representation exists with a round-trip test; the shape is documented in `docs/architecture.md`.

## 3. Laravel mints an envelope

`POST /runs` authenticates the user, resolves group policy, mints a short-lived signed envelope, persists a `runs` row, and dispatches to the agent runtime.

**Done when:** an authenticated request produces a persisted run and a signed envelope; an unauthenticated one is rejected; an expired envelope is rejected by the runtime; **a test asserts no provider key appears anywhere in the envelope**.

## 4. Agent runtime constructs an isolated pi session

Verify the envelope, then build a pi session with explicit `cwd` and `agentDir`, `AuthStorage.inMemory()`, `SettingsManager.inMemory()`, `modelsPath: null`, discovery disabled, and a programmatically registered LiteLLM provider using the run's virtual key.

**Done when:** a run completes against LiteLLM; a test proves the session reads nothing from `~/.pi` and writes nothing outside its run directory; two concurrent runs with different envelopes do not observe each other's models, credentials or files.

## 5. Event streaming to React

pi events → runtime → Laravel or direct SSE → an Inertia page rendering a live token stream.

**Done when:** a user sends a message and sees streamed output; the stream survives a page refresh mid-run; a failed run surfaces an error rather than hanging.

## 6. Cancellation

Cancel from the UI: `AgentSession.abort()`, in-flight model request cancelled, sandbox torn down, run marked cancelled.

**Done when:** cancelling mid-tool-call leaves no orphaned process, container or open stream; the run's final state is `cancelled` in the database.

## 7. Policy extension

A `tool_call` hook returning `{ block: true }` for anything outside the envelope's allow-list, plus the separate `user_bash` path.

**Done when:** a blocked tool provably does not execute (assert on the side effect, not the transcript); the block is recorded in the audit trail; a test covers `user_bash` independently of `tool_call`.

## 8. One custom tool

A trivial first-party tool registered from our own code — enough to establish the pattern for every tool that follows.

**Done when:** the model can call it, it appears in the audit trail, and it is blocked when the envelope excludes it.

## 9. Sandbox broker boundary

Broker service owning container lifecycle; a container-routing extension replacing pi's `read`/`write`/`edit`/`grep`/`find`/`ls`/`bash` with brokered execution.

**Done when:** a `bash` tool call executes inside a disposable container and not on the host; **no socket is mounted anywhere** and a test asserts it; the container is removed when the run ends and when the run is cancelled.

## 10. Measure

Concurrent-run RAM and CPU, container start latency, first-token latency, teardown time.

**Done when:** numbers are written into `docs/` with the method used, and we know how many concurrent runs a €50 Hetzner box actually supports.

---

## Phase 1 is done when

One person can send a message in a browser, watch a real model stream a response, watch a tool run in a disposable container, watch a forbidden tool get blocked, cancel it mid-run — and every step of that is in the audit trail. Then we know the architecture holds and the rest is ordinary work.

# Cloudflare OS comparison

## Scope and conclusion

This study used read-only clones of:

- `/home/ubuntu/research/cloudflare-os`
- `/home/ubuntu/research/cloudflare-os-starter`

The upstream code studied through the starter is recorded at submodule commit
`bf7f762d7fa73553284d731ab6a978d3ea17be24`. The comparison uses source paths
and short quotations, not Cloudflare blog or marketing claims.

Cloudflare OS is a useful governance reference, not a portable Musaed runtime.
Its central ideas worth adopting are observation recording, a read/write tool
split, approval suspension, bounded untrusted discovery, and capability-shaped
external access. Its execution substrate is Workers-native and does not map
onto Musaed's Laravel control plane, Node runtime, and rootless Podman broker.

## What they built

The standalone repository is a pnpm monorepo named `gadgets`, with
`packages/*` workspaces (`package.json`, `pnpm-workspace.yaml`). Its major
boundaries are:

- `packages/workshop-backend`: the kernel, agent orchestration, workspace
  state, sharing, action/observation records, and model routing;
- `packages/workshop-frontend`: the browser SPA;
- `packages/workshop-shared`: RPC/API and gatekeeper contracts;
- `packages/gatekeeper-*`: separate external-service adapters;
- `packages/gatekeeper-context`: context collections and skills;
- `packages/mcp-shared`: MCP client and approval classification;
- `packages/router`, `typed-storage`, and deployment/test packages.

The repository is approximately 813 files and 22 MB in the shallow clone.
`workshop-backend` is approximately 74 TypeScript files and 41,000 lines;
`workshop-frontend` approximately 56 files and 6,000 lines; and
`workshop-shared` approximately 6 files and 4,000 lines. These are rough
inspection measurements, not upstream project metrics.

The starter is a thin deployment/customization repository. Its custom
packages are `packages/custom-gatekeeper` and `packages/error-reporter`; the
upstream OS is the submodule. Its deployment files are under `scripts/`,
`deployment.jsonc`, and `docs/`.

## Why the runtime is not portable to Musaed

The Cloudflare README says:

> “Cloudflare OS is built on Cloudflare Workers, making heavy use of
> Durable Objects, Dynamic Workers, and Facets”

at `/home/ubuntu/research/cloudflare-os/README.md:116-118`.
`packages/workshop-backend` imports `DurableObject`, `WorkerEntrypoint`, and
native Worker RPC types from `cloudflare:workers`. Workspace state is a
Durable Object; gatekeepers install Worker facets; and storage uses Durable
Object typed storage rather than PostgreSQL.

Generated agent code is loaded as a Dynamic Worker in
`packages/workshop-backend/src/overseer.ts:5370-5489`. Its definition sets:

> `globalOutbound: null`

and compatibility flags including:

> `"disallow_importable_env"`

This is a Worker runtime isolation primitive, not a container interface that
can be transferred to Podman.

The frontend/backend boundary is Cap'n Web RPC over a persistent WebSocket.
`packages/workshop-frontend/src/main.tsx` calls
`newWebSocketRpcSession<PublicApi>(wsUrl)`. Gadget/browser isolation also uses
sandboxed iframes and `postMessage()`.

Cloudflare Access and AI Gateway appear as environment bindings and model
routing/cost infrastructure in `packages/workshop-backend/src/ai-models.ts`
and Worker configuration. They are not substitutes for Laravel policies,
signed run envelopes, or Musaed's control-plane credential custody.

The README explicitly marks self-hosted workerd deployment:

> “**COMING SOON**”

and says documentation/tooling for smooth deployment on own servers is still
being developed (`README.md:93-97`). Even if workerd is eventually suitable,
Musaed would still need replacements for Durable Objects, Facets, Dynamic
Workers, Cap'n Web service RPC, Access configuration, and AI Gateway.

The portable part is the domain vocabulary and some ordinary TypeScript
parsing/validation. The runtime kernel is not portable without reimplementing
its platform primitives.

## Governance comparison

### Cloudflare's model

The contracts in
`packages/workshop-shared/src/gatekeeper.ts` define a resource-oriented
Gatekeeper. A resource has a canonical URL, display metadata, a suggested
binding name, and a TypeScript type name. A capability reaches generated code
as a named binding assembled by `overseer.ts:getEnvForAgent()`. The generated
code receives loopback RPC stubs for selected gatekeeper resources, not the
whole Worker environment.

Credentials remain behind the Gatekeeper/account Worker. For example,
`packages/gatekeeper-github/src/github.ts:1115` stores an OAuth token with:

> `this.ctx.storage.kv.put("accessToken", grant.accessToken);`

`packages/mcp-shared/src/account.ts:2` describes the account object as the:

> “only place an access token is stored, refreshed, or handed out.”

Policy is expressed through resource grantability, observation authorization,
action descriptions, stable action kinds, auto-approval hints, and observer
exclusion. It is not a generic policy DSL. In particular, a generic field
masking engine and a general gatekeeper rate-limit DSL are **not present**.

The MCP trust boundary is
`packages/mcp-shared/src/tools.ts:142-183`. It classifies:

> “`read` runs immediately and is recorded as an observation; `action` goes to
> the queue.”

The implementation uses `readOnlyHint === true` for reads. Writes are queued;
auto-application additionally requires a vetted endpoint and safe annotations.

### Observation log and enforcement

`packages/workshop-backend/src/overseer.ts:424-461` defines `ActionRecord`
variants for actions, observations, and bind hooks. Common fields include the
record ID, gatekeeper ID, caller, resource title/URL, creation time, and state.
An observation carries an `ObservationDescription` with title, full
description, `prohibitAllSharing`, and `excludeObservers`.

`authorizeObservation()` at `overseer.ts:2644-2685` checks sensitive-sharing
flags, updates lockdown/observer state, and stores an approved observation in
the workspace Durable Object's `storage.actions`. Built-in reads use a
separate record path with sentinel gatekeeper ID `-1`.

Enforcement happens at several boundaries:

- workspace opening (`overseer.ts:6339-6465`) checks role, sharing lockdown,
  and `ensureObserver()` for every resource the workspace has observed;
- output synchronization rechecks effective sharing and observer reachability;
- context reads call `authorizeObservation()` before returning data
  (`packages/gatekeeper-context/src/library-read.ts`);
- public web fetch is blocked after sensitive observations;
- collaborator access is lazily revoked by recomputing effective reachability;
- `prohibitAllSharing` blocks future sharing and actions.

Cloudflare's `prohibitAllSharing` is explicitly described in
`packages/workshop-shared/src/gatekeeper.ts:209-222` as a stopgap:

> “This was added as a stopgap”

We do not adopt that blunt global lockdown. Musaed has no sharing,
collaborators, or artifact visibility to enforce yet. We adopt observation
recording now, as an audit prerequisite, and defer visibility enforcement to
Phase 2.

### Access requests

`packages/workshop-backend/src/overseer.ts:5591-5665` creates a
`connectionRequest` message with a random request ID, the resolved vendor and
resource, reason/title, and `"pending"` state. Acceptance changes it to
`"accepted"`, stores the gatekeeper ID, and resumes the suspended agent.
Denial changes it to `"denied"` and deliberately does not resume the agent.
The source says:

> “The denial is recorded in history and the agent sees it the next time the
> user sends a message”

Musaed adopts the read/write split and await-decision semantics, but does not
add Gatekeeper interfaces yet. The MCP gateway is the likely Phase 2 home:
per-resource adapters should hold credentials, expose narrow typed surfaces,
and let policy attach to resources rather than individual model-described
tools. `AGENTS.md` says not to add abstractions before they are earned, so no
interfaces are introduced by this study.

## What we adopt

### Observation recording

Phase 1 will record each governed read with its run, conversation, resource,
policy version, caller, and timestamp. It will be attached to both run and
conversation records. This is audit-only until sharing exists.

An audit-only log is not the security property. It is the prerequisite for
enforcing recipient visibility when collaborators or artifacts arrive.

### Read/write governance

A read-only tool executes and records an observation. Any external side effect
enters the approval queue. This is the concrete tool-boundary rule, not a
future aspiration. Uncertain classification must not be silently treated as a
read.

### Await-decision semantics

Approval-required calls suspend the run. A suspended run state is required:
letting the model continue would let it reason against a world where its
unapproved action did not happen. The current Musaed state machine does not
yet have that state; it belongs in Phase 1.

### Skill manifests and untrusted catalogues

We adopt `SKILL.md` with YAML `name` and `description`, lowercase-hyphenated
names, size caps, and a Markdown body. Cloudflare validates this in
`packages/gatekeeper-context/src/agent-skill.ts:72-140`.

The model-facing catalogue remains bounded, untrusted discovery metadata. It
does not grant authority; reading the skill is separately governed. Musaed
already uses this filename convention for repository tooling.

## What we reject

- Workers, Durable Objects, Facets, Dynamic Workers, `cloudflare:workers`,
  Cap'n Web as the runtime substrate, and Cloudflare Access as a deployment
  assumption;
- AI Gateway as a control-plane substitute;
- direct-provider credential handling in the agent path;
- `prohibitAllSharing` as a global lockdown;
- copying Cloudflare source.

Musaed's provider boundary is intentionally stronger for this product:
Laravel and LiteLLM retain provider/control-plane credentials, while the
runtime receives only a short-lived, model-scoped LiteLLM virtual key. The
LiteLLM master key never enters the envelope or runtime. That is not a detail
to smooth over for architectural symmetry.

## What their absences tell us

The repository has lexical retrieval, not embeddings. In
`packages/gatekeeper-context/src/context-collection.ts:596-632`, search
lowercases whitespace tokens and scores name, description, and body matches.
There is no application use of Vectorize or embeddings. This supports
Musaed's existing no-vector-database rule and suggests PostgreSQL full-text
search as the first context retrieval implementation, not pgvector.

The inspected source does not establish:

- a generic field-masking policy engine;
- a general rate-limit policy DSL;
- team-level model budgets or cost-center allocation;
- a dedicated long-term conversational memory subsystem;
- a generic external secret-vault integration;
- a complete dependency/bundled-asset licence audit.

These are findings, not omissions to fill with marketing language. A system
intended for broad internal use shipped with a narrower governance surface.
That is a useful prior: Musaed should earn each additional policy mechanism
from a concrete requirement and measured failure mode.

## Models and attribution

Cloudflare selects models in application code. `getModel()` in
`packages/workshop-backend/src/ai-models.ts` receives model configuration,
initiator, routing, session affinity, and metadata. The application builds
metadata with:

> `const metadata: GatewayMetadata = { user: initiator.id };`

The metadata type includes user, source, gadget ID, chat ID, and an automated
marker (`ai-models.ts:33-44`). AI Gateway supplies provider routing,
credential forwarding, request logs, and cost records. The application owns
model selection, user attribution, free-tier quota decisions, BYOK routing,
and chat/workspace cost persistence. A complete team budget model is **not
present**.

The source even leaves model-binding audit/cost work unfinished:
`packages/workshop-backend/src/ai-models.ts:669-671` says:

> “TODO: Should we be calling authorizeObservation() here?”

and:

> “TODO: Account LLM costs back to the calling gadget.”

That is evidence to preserve in the comparison, not a reason to claim the
platform supplies enterprise accounting automatically.

## Licensing mechanics

Both roots contain an Apache License 2.0 `LICENSE`:

- `/home/ubuntu/research/cloudflare-os/LICENSE`
- `/home/ubuntu/research/cloudflare-os-starter/LICENSE`

No root `NOTICE` file was found. Handwritten source files do not uniformly
carry Apache headers; generated `worker-configuration.d.ts` files do contain
generated Apache headers. Package manifests generally do not declare a
license field, and no complete dependency or bundled-asset notices inventory
was found. Therefore the verified claim is root Apache-2.0 licensing, not
that every dependency or asset is Apache-licensed.

Musaed took no Cloudflare code. If code is copied in a future deliberate
decision, the copied file must retain its own licence/header treatment and
the required NOTICE must be added; learning from Apache-2.0 source is not the
same as copying it.

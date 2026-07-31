# Architecture

## The one idea

Every design decision in Musaed follows from a single separation:

> **The control plane owns authority. The runtime only executes.**

Laravel decides who may do what, with which model, using which tools, against which data. It expresses that decision as a signed, short-lived **run envelope**. The Node agent runtime receives the envelope and executes within it. The runtime cannot widen its own permissions, cannot enumerate other tenants' configuration, and holds no long-lived provider credentials.

Four distinctions follow, and confusing any two of them is how governed AI systems fail:

| | |
|---|---|
| **Catalogue ≠ execution** | An MCP server existing in the admin catalogue does not mean any run may call it. |
| **Execution ≠ authorisation** | A tool being *callable* does not mean this user, in this group, may call it now. |
| **Authorisation ≠ audit** | Permitting a call does not record what actually happened. Both are required. |
| **Container ≠ security** | The sandbox is one layer. Policy hooks, egress control and approvals are the others. |

## Components

```mermaid
flowchart TB
    subgraph client["Browser"]
        ui["React + Inertia<br/>chat · artifacts · admin UI<br/>live sandbox view via noVNC"]
    end

    subgraph control["apps/web — Laravel control plane · SYSTEM OF RECORD"]
        web["auth · users &amp; groups · policy<br/>model &amp; MCP catalogue · conversations<br/>memory · artifacts · audit · budgets<br/><b>provider credential custody</b>"]
    end

    subgraph runtime["apps/agent — Node 24 + pi SDK · EXECUTOR ONLY"]
        agent["session construction · tool loop<br/>streaming · cancellation<br/>policy · audit · container-routing extensions"]
    end

    subgraph egress["Mediated egress and isolation"]
        litellm["LiteLLM<br/>model gateway"]
        mcpgw["MCP gateway<br/>admin-provisioned"]
        broker["apps/broker<br/>rootless Podman lifecycle<br/>create · exec · copy · stop · GC"]
    end

    subgraph outside["Outside the trust boundary"]
        providers["Model providers"]
        mcpsrv["Isolated MCP servers"]
        sandbox["Disposable sandboxes<br/>browser · artifacts"]
    end

    data[("PostgreSQL + pgvector<br/>Redis / Horizon")]

    ui -->|"Inertia page state"| web
    web -->|"SSE / WebSocket run events"| ui
    web ==>|"signed, short-lived<br/>run envelope"| agent
    agent -->|"events · audit · approval requests"| web
    web --- data

    agent --> litellm --> providers
    agent --> mcpgw --> mcpsrv
    agent -->|"opaque handle, brokered exec<br/><b>never a container socket</b>"| broker
    broker --> sandbox
    ui -.->|"noVNC live view &amp; takeover"| sandbox

    classDef authority fill:#0b4f8a,stroke:#062f52,color:#fff
    classDef executor fill:#1151b4,stroke:#0b3577,color:#fff
    classDef untrusted fill:#8a3a0b,stroke:#5c2607,color:#fff
    class web authority
    class agent executor
    class providers,mcpsrv,sandbox untrusted
```

### The run lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as Employee
    participant L as Laravel control plane
    participant A as Agent runtime
    participant G as LiteLLM
    participant B as Broker
    participant S as Sandbox

    U->>L: send a message
    L->>L: resolve group policy,<br/>mint per-run virtual key
    L->>A: signed run envelope<br/>(models · tools · sandbox · expiry)
    A->>A: build isolated pi session<br/>in-memory credentials, per-run cwd/agentDir
    A->>G: completion request (virtual key)
    G->>A: streamed tokens
    A-->>L: events + audit
    L-->>U: streamed response

    A->>A: policy hook checks tool call
    alt outside the envelope
        A-->>L: blocked, audited
    else needs human approval
        A->>L: approval request
        L->>U: approve or deny
        U-->>L: decision
        L-->>A: decision
    else permitted
        A->>B: brokered exec
        B->>S: run in disposable container
        S-->>B: result / artifact
        B-->>A: result
    end

    A->>L: run complete, tokens and cost attributed
    B->>S: teardown on completion, cancellation or idle expiry
```

Cross-cutting: PostgreSQL + pgvector · Redis/Horizon · OpenTelemetry.

## The run envelope

The envelope is the contract between the two halves of the system. It is short-lived (single run, minutes), signed, and contains everything the runtime is allowed to know:

- run, conversation, user and group identity
- the resolved policy version it was minted under
- the model aliases this run may use
- the tool and MCP allow-list, and which calls require human approval
- a **per-run virtual key** for LiteLLM — not a provider key
- sandbox entitlement and resource ceiling
- callback coordinates for events, audit and approval requests

The runtime never reads global configuration to answer "am I allowed to". If it isn't in the envelope, the answer is no.

## Agent session construction

Every run builds a fresh, fully explicit pi session. Defaults are the enemy here — pi's file-backed defaults would otherwise reach for `~/.pi`, a shared model catalogue and on-disk credentials, all of which are process-global and therefore cross-tenant.

```ts
const runtime = await ModelRuntime.create({
  credentials: AuthStorage.inMemory(),   // never ~/.pi/agent/auth.json
  modelsPath: null,                      // never the shared catalogue file
  modelsStore: new InMemoryModelsStore(),
});

runtime.registerProvider("litellm", {
  api: "openai-completions",
  baseUrl: env.LITELLM_URL,
  apiKey: envelope.virtualKey,           // literal, request-scoped
  models: envelope.allowedModels,
});

const { session } = await createAgentSession({
  cwd: runWorkspace,                     // explicit, per-run
  agentDir: runAgentDir,                 // explicit, per-run
  modelRuntime: runtime,
  settings: SettingsManager.inMemory(),
  tools: envelope.allowedTools,
  resourceLoader: new DefaultResourceLoader({
    noExtensions: true,
    noContextFiles: true,
    extensionFactories: [policy, audit, containerRouting],
    systemPrompt: orgSystemPrompt,
  }),
});
```

Three extensions are always present:

- **policy** — `tool_call` returns `{ block: true }` for anything outside the envelope, and pauses for human approval where the envelope demands it. Note that user-initiated shell goes through a *separate* `user_bash` path and must be governed independently.
- **audit** — records every tool call, result, model request and token count against the run.
- **container routing** — replaces pi's built-in `read`/`write`/`edit`/`grep`/`find`/`ls`/`bash` so they execute inside the run's sandbox rather than on the host.

Policy is enforced twice: in the envelope (the runtime is only *told* about permitted tools) and in the hook (a compromised or confused model still cannot call outside it). Neither layer is trusted alone.

## Sandboxes

One disposable rootless Podman container per computer-use run. The broker owns the lifecycle; the agent gets an opaque handle and an exec channel, never a socket.

- digest-pinned, self-built image: Chromium + Xvfb + x11vnc + noVNC
- noVNC for live view and human takeover; CDP for automation
- ~2000 millicores / 3 GiB interactive, ~1000 millicores / 1–2 GiB headless
- deny-by-default egress through a CONNECT-proxy allow-list; metadata endpoints, RFC1918, link-local and SMTP blocked
- `no-new-privileges`, dropped capabilities, read-only rootfs where practical, seccomp/AppArmor
- 15–30 minute idle expiry, tagged with tenant/user/run/expiry, reconciler garbage-collects orphans
- non-persistent by default: no browser profile survives the run
- artifacts leave via the broker to object storage — long-lived storage credentials never enter the container

See [`computer-use-containers.md`](../../research/computer-use-containers.md) in the research set for the full design.

## Data

PostgreSQL is the system of record; pgvector holds embeddings. There is no separate vector database until there is a measured reason for one.

Memory is a first-class, *governed* object: scoped per user and per organisation, visible to the user, revocable by an admin, and never silently shared across group boundaries.

pi's own session storage is version-3 JSONL and its `SessionManager` is a concrete class with a private constructor — it is **not** a drop-in Postgres backend. Run events are therefore persisted at the application layer, and pi's storage is treated as ephemeral run scratch.

## Streaming

Run events flow from the agent runtime to the browser over SSE (WebSocket if bidirectional need appears). Inertia carries page state; it is deliberately not in the streaming path. Cancellation is first-class: `AgentSession.abort()` plus broker teardown, reachable from the UI at any point in a run.

## What is deliberately not here

- **Cross-organisation multi-tenancy.** Each organisation self-hosts its own instance. Per-*user* isolation within an instance is still mandatory.
- **A bespoke vector database.** pgvector until proven insufficient.
- **Employee BYOK, employee model selection, employee MCP installation.** These are the product's negative space; adding them makes it a different product.

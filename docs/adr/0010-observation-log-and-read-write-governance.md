# 10. Observation log and read/write governance

Date: 2026-08-05 · Status: accepted

## Context

Musaed governs what a run may do, but it does not record what a run saw. That is
safe only while runs are not sharing data with collaborators or publishing
artifacts. Once sharing exists, an artifact can launder data to a recipient who
could not have read the source directly. Retrofitting observation call sites
after sharing exists would be expensive and incomplete.

Cloudflare OS makes the distinction explicit. Its MCP trust boundary says:

> “a tool the server declares `readOnlyHint: true` runs as an observation,
> everything else is queued for approval”

Its action contract also explains why an approval-required turn must stop:

> “an agent that keeps going would observe a world where its action ‘didn't
> happen’”

The source evidence is in
`/home/ubuntu/research/cloudflare-os/AGENTS.md` and
`/home/ubuntu/research/cloudflare-os/packages/mcp-shared/src/tools.ts`.

Musaed has no sharing, collaborator, or artifact-visibility enforcement yet.
There is therefore nothing for an observation check to protect today. The
record is still worth adding at the same time as the tool boundary: the
expensive part is making every governed read pass through the boundary, not
adding a later database query.

## Decision

Adopt observation recording and the read/write governance split together.

At the Phase 1 tool boundary:

- a read-only tool executes and records an observation;
- a tool with an external side effect enters the approval queue;
- an observation records the run, conversation, caller, resource, policy
  version, and timestamp;
- the observation is attached to both the run and its conversation;
- the observation record is audit-only until sharing and collaborator-visible
  artifacts exist;
- an approval-required call suspends the run until a human approves or denies
  it.

An audit-only log is **not** the security property. It is the prerequisite for
the later security property: enforcing that a collaborator or artifact
recipient may see only data they were entitled to observe.

Add a suspended run state to the run state machine before implementing
approval-required execution. A run must not continue reasoning from reads that
assume an unapproved side effect happened.

In Phase 2, when sharing exists, enforce observation visibility at the
workspace-opening, output-delivery, collaborator, and relevant resource
boundaries. The Phase 2 implementation may add resource-specific policy, but
this ADR does not adopt a global lockdown policy.

## Consequences

Every governed read creates a database write. That adds storage, transaction,
and performance cost to the common path, but avoids an unbounded audit
retrofit and gives every later visibility decision a source record.

The lifecycle gains a suspended state and approval-resumption transitions.
This is more state-machine work than treating approval as a browser-only
prompt, but the latter would let the agent proceed against a false world.

Until Phase 2 enforcement exists, the log can mislead a reader into thinking
that observed data is flow-controlled. Documentation and UI must call it
audit-only; recording does not prevent a future share or artifact leak.

The read/write split depends on tool classification. Unannotated or uncertain
tools must not receive read-only treatment merely because a model describes
them as safe.

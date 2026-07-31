# 1. Record architecture decisions

Date: 2026-07-31 · Status: accepted

## Context

Musaed makes a number of decisions that look arbitrary from the outside and are expensive to revisit: two runtimes, a specific agent SDK, a container strategy, a licence. Contributors — human and agent — will otherwise re-litigate them in pull requests.

## Decision

Record every significant architectural decision as a numbered ADR in `docs/adr/`, in the format: context, decision, consequences. ADRs are immutable once accepted; a change of mind is a new ADR that supersedes the old one.

## Consequences

Slight overhead per decision. In exchange, "why is this Laravel *and* Node?" has a one-link answer, and reversals are explicit rather than accidental.

# 7. PostgreSQL + pgvector for memory and retrieval

Date: 2026-07-31 · Status: accepted

## Context

Memory needs embeddings and similarity search. The obvious move is a dedicated vector database (Qdrant, Weaviate, Milvus) or a memory framework (mem0, Letta, Zep).

But memory here is a *governed* object: scoped per user and organisation, visible to its owner, revocable by an admin, joined to permissions and audit. Splitting it from the relational store means distributed consistency, two backup stories and two access-control implementations — for ten users on one box.

## Decision

PostgreSQL with pgvector for everything: relational data and embeddings in one database, one transaction, one backup. Memory extraction and retrieval are our own code, informed by mem0/Zep's approaches rather than importing them.

## Consequences

One fewer service, transactional consistency between a memory row and its permissions, and one backup to get right.

pgvector is slower at very large scale than a dedicated engine. Irrelevant at target scale, and the migration path stays open — this ADR gets superseded when measurement, not speculation, says so.

Memory quality is now our problem rather than a framework's. Given that memory scoping and revocation are governance features here, that work was not avoidable anyway.

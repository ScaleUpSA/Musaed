# 4. Inertia monolith rather than a separate SPA

Date: 2026-07-31 · Status: accepted

## Context

The frontend could be an Inertia-served React app inside Laravel, or a standalone React SPA against a Laravel API.

Most of the code is the admin console: models, MCP manifests, groups, policies, budgets, audit — CRUD with server-side validation and authorisation. The realtime surfaces (chat streaming, agent events, the noVNC sandbox view) do not go through Inertia in either design; they are their own channel from the runtime.

Musaed is self-hosted software. Install friction is a product feature.

## Decision

Inertia + React + TypeScript + Vite, served by Laravel. One deployable web application. Run events arrive over SSE/WebSocket alongside, not through, Inertia.

## Consequences

One build pipeline, one deploy artifact, no CORS, no hand-maintained DTO layer between validation and forms. `docker compose up` stays short.

No HTTP API for third-party or mobile clients. Accepted: if one is ever needed, a Sanctum-authenticated API can be added for those consumers without rewriting the web app. Building it upfront would be paying for a requirement that does not exist.

# 8. MIT licence

Date: 2026-07-31 · Status: accepted

## Context

The realistic candidates were MIT/Apache-2.0 (maximum reach, no reciprocity) and AGPL-3.0 (a hosted derivative must publish its changes).

AGPL would prevent someone running Musaed as a closed SaaS. It also deters enterprise adoption, which is the audience this product is for.

The project exists because ScaleUp needs it, not to capture a market — so the value AGPL protects is value we were not planning to collect.

## Decision

MIT.

## Consequences

Anyone may run, modify, embed or commercialise Musaed, including as a closed-source hosted service, without contributing anything back. Accepted knowingly.

Maximum compatibility with the dependency graph, and no licence friction for enterprises evaluating a self-hosted deployment.

It constrains what we may copy: MIT/Apache/BSD/ISC sources only. Specifically excluded — Open WebUI (branding and licence restrictions), Dify (source-available), Kasm images, and AGPL projects such as Khoj and Cherry Studio. They remain fine as *references*; no code, no assets.

Transitive dependencies still require a notice inventory and an SBOM before the first public release. pi itself is MIT, but its tree includes Apache-2.0, BSD-3-Clause, ISC and dual-licensed packages, and its HTML exporter vendors minified `highlight.js` and `marked`.

# 6. LiteLLM as the model gateway

Date: 2026-07-31 · Status: accepted

## Context

"The admin owns one key and employees never see it" needs a component that makes it true. The agent runtime must be able to call a model without ever holding a provider credential, and an administrator must be able to change providers without redeploying anything.

Cheap models make this *more* important, not less: at these prices the operator will swap models often, and every swap is a potential quality regression.

## Decision

All model traffic egresses through LiteLLM. Provider keys live only in the control plane and LiteLLM. Each run receives a short-lived **virtual key** scoped to the model aliases its group permits.

Employees see aliases ("fast", "deep research"), never provider or model identifiers.

## Consequences

One more service in the compose stack, and LiteLLM becomes a hard dependency on the request path.

In exchange: real credential custody, per-run and per-group model scoping, task-based routing, usage attribution per user and run, and a provider swap that is a configuration change rather than a code change. Data residency becomes a deployment-time decision the operator makes by pointing LiteLLM somewhere, which is exactly right for self-hosted software.

Because swapping models is now cheap, an **evaluation harness is required early** — otherwise quality regressions are invisible until a user complains.

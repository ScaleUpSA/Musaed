# 5. Disposable rootless Podman sandboxes, owned by a broker

Date: 2026-07-31 · Status: accepted

## Context

Computer use, tool execution and artifact generation all run model-directed code. None of it may touch the host. Options: run on the host with policy alone (unacceptable), a hosted sandbox service such as E2B or Daytona (an external dependency and a data-residency decision, in a product whose selling point is that you host it), or self-managed containers.

## Decision

One disposable rootless Podman container per run, non-persistent by default, with a privileged **broker** owning the entire lifecycle: create, inspect, exec, copy, stop, remove, reconcile.

- Self-built, digest-pinned image: Chromium + Xvfb + x11vnc + noVNC. noVNC for live view and human takeover; CDP for automation.
- ~2 vCPU / 3 GiB interactive, ~1 vCPU / 1–2 GiB headless. 15–30 minute idle expiry.
- `no-new-privileges`, dropped capabilities, seccomp/AppArmor, read-only rootfs where practical, CPU/RAM/PID ceilings.
- Deny-by-default egress through a CONNECT-proxy allow-list; metadata endpoints, RFC1918, link-local, host gateway and SMTP blocked.
- Tagged with tenant/user/run/expiry; a reconciler garbage-collects orphans.
- Artifacts leave through the broker to object storage; no long-lived storage credentials inside the container.

**The agent never receives a container socket.** It gets an opaque handle and a brokered exec channel.

## Consequences

We own image builds, resource tuning, GC and the broker — real work, and the broker becomes a privileged component requiring careful review.

In exchange: no external sandbox dependency, no third-party data path, and a deployment that fits on one Hetzner box (3–5 concurrent browser sandboxes at these limits, against a realistic 2–4).

Rootless Podman constrains some workloads compared to rootful Docker. Accepted — the isolation is worth it. Docker remains supported for deployers who prefer it, with the same broker interface and a documented weaker posture.

Kasm has the nicest UX in this space and is excluded: its licensing is not permissive enough for an MIT project. Reference only.

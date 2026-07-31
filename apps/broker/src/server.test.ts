import { describe, expect, it } from "vitest";

import { buildServer } from "./server.js";

describe("broker service", () => {
  it("reports health", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "broker" });
    await app.close();
  });

  it("creates a sandbox from a valid request", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/sandboxes",
      payload: {
        runId: "run-1",
        image: "sandbox:latest",
        cpuLimit: 2,
        memoryLimitMb: 512,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "sandbox-run-1",
      runId: "run-1",
      status: "running",
    });
    await app.close();
  });

  it("rejects malformed and unsafe sandbox requests", async () => {
    const app = buildServer();
    const cases = [
      { runId: "run-1", image: "sandbox:latest", cpuLimit: 0, memoryLimitMb: 512 },
      { runId: "run-1", image: "sandbox:latest", cpuLimit: 2, memoryLimitMb: 8 },
      { runId: "run-1", image: "sandbox:latest", cpuLimit: 2, memoryLimitMb: 512, extra: true },
    ];

    for (const payload of cases) {
      const response = await app.inject({
        method: "POST",
        url: "/sandboxes",
        payload,
      });

      expect(response.statusCode).toBe(400);
    }

    await app.close();
  });
});

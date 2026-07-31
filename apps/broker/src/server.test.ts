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
});

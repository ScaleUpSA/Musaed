import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { agentEventFixtures } from "./agent-event-fixtures.js";

describe("agent event fixtures", () => {
  it("stay aligned with the shared cross-language fixture file", () => {
    const file = resolve(process.cwd(), "../../apps/web/tests/Fixtures/agent-events.json");
    const json = JSON.parse(readFileSync(file, "utf8")) as typeof agentEventFixtures;

    expect(json).toEqual(agentEventFixtures);
  });
});

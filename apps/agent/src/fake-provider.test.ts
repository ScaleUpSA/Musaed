import { describe, expect, it } from "vitest";

import { completeFakeResponse } from "./fake-provider.js";

describe("completeFakeResponse", () => {
  it("returns an obviously fake response", async () => {
    const chunks: string[] = [];

    for await (const chunk of completeFakeResponse("a request")) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("This is a clearly fake response for: a request");
  });
});

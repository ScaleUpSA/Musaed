import { describe, expect, it } from "vitest";

import { ClearlyFakeModelProvider, type ModelProvider } from "./fake-provider.js";

describe("ClearlyFakeModelProvider", () => {
  it("uses the replaceable model provider boundary", async () => {
    const provider: ModelProvider = new ClearlyFakeModelProvider();
    const chunks: string[] = [];

    for await (const chunk of provider.complete("a request")) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("This is a clearly fake response for: a request");
  });
});

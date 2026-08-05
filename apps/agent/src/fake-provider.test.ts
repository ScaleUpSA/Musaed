import { describe, expect, it } from "vitest";

import { startFakeProvider } from "./fake-provider.js";

describe("placeholder provider", () => {
  it("serves an OpenAI-compatible streamed placeholder response", async () => {
    const provider = await startFakeProvider();

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "a request" }],
          stream: true,
        }),
      });

      expect(response.ok).toBe(true);
      expect(await response.text()).toContain("clearly");
    } finally {
      await provider.close();
    }
  });

  it("emits a placeholder write tool call when requested", async () => {
    const provider = await startFakeProvider();

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "MUSAED_PLACEHOLDER_TOOL_TEST" }],
          stream: true,
        }),
      });
      const body = await response.text();

      expect(body).toContain("placeholder-write-call");
    } finally {
      await provider.close();
    }
  });
});

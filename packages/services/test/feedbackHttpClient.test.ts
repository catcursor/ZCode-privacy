import { describe, expect, it, vi } from "vitest";
import { FeedbackHttpClient } from "../src/feedback/feedbackHttpClient.js";
describe("privacy edition feedback publication is removed", () => {
  it("rejects every endpoint before reading auth, serializing input or opening files", async () => {
    const request = vi.fn(),
      getAuthHeaders = vi.fn();
    const client = new FeedbackHttpClient({
      apiClient: { request },
      baseUrl: "https://support.example",
      getAuthHeaders,
    });
    const read = vi.fn(() => {
      throw new Error("must not read private input");
    });
    const input = new Proxy({} as Parameters<typeof client.create>[0], { get: read });
    for (const operation of [
      () => client.create(input),
      () => client.list(),
      () => client.get("test"),
      () => client.comment("test", "synthetic-secret"),
      () => client.uploadFile("test", "log", "missing-file", "test.zip", "application/zip"),
    ])
      await expect(operation()).rejects.toMatchObject({ code: "PRIVACY_RESTRICTION" });
    for (const spy of [request, getAuthHeaders, read]) expect(spy).not.toHaveBeenCalled();
  });
});

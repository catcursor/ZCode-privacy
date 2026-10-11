import { describe, expect, it, vi } from "vitest";
import {
  ConversationShareHttpClient,
  ConversationShareClientError,
} from "../src/conversation-share/conversationShareHttpClient.js";
describe("privacy edition conversation cloud publication is removed", () => {
  it("rejects all endpoints before reading tokens or private descriptors", async () => {
    const request = vi.fn(),
      tokenProvider = vi.fn();
    const client = new ConversationShareHttpClient({
      apiClient: { request },
      baseUrl: "https://share.example",
      tokenProvider,
    });
    const read = vi.fn(() => {
      throw new Error("must not inspect private input");
    });
    const privateInput = new Proxy({}, { get: read });
    for (const operation of [
      () => client.getCapabilities(),
      () =>
        client.createPreparation(privateInput as Parameters<typeof client.createPreparation>[0]),
      () =>
        client.uploadArtifact(
          "test",
          privateInput as Parameters<typeof client.uploadArtifact>[1],
          new Blob(["synthetic-secret"]),
        ),
      () => client.confirm("test", privateInput as Parameters<typeof client.confirm>[1]),
      () => client.getPreview("test"),
      () =>
        client.getContinuation(
          "test",
          privateInput as Parameters<typeof client.getContinuation>[1],
        ),
    ])
      await expect(operation()).rejects.toMatchObject({ code: "PRIVACY_RESTRICTION" });
    for (const spy of [request, tokenProvider, read]) expect(spy).not.toHaveBeenCalled();
  });
  it("keeps stable local error contracts and rejects unsafe request identifiers", () => {
    const error = new ConversationShareClientError({
      kind: "feature_disabled",
      message: "disabled",
      requestId: "unsafe\nvalue",
      clientRequestId: "unsafe?token=secret",
    });
    expect(error.kind).toBe("feature_disabled");
    expect(error.requestId).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

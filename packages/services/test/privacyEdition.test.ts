import { describe, expect, it, vi } from "vitest";
import type { TelemetryRendererContext } from "@zcode/shared";
import { createNodeApiClient } from "../src/providers/api/nodeApiClient.js";
import { createHostApiNetworkTransport } from "../src/providers/api/nodeApiNetwork.js";
import { createTelemetryCore } from "../src/telemetry/telemetryCore.js";
import { ConversationShareHttpClient } from "../src/conversation-share/conversationShareHttpClient.js";
import { FeedbackHttpClient } from "../src/feedback/feedbackHttpClient.js";
import { createCredentialCipherProvider } from "../src/credential/providers/credentialCipherProvider.js";

describe("privacy edition boundaries", () => {
  it("preserves custom API hosts, request bodies, redirects and proxy configuration", async () => {
    const transport = vi.fn(
      async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => new Response("ok"),
    );
    const client = createNodeApiClient({ fetchImpl: transport });
    await client.request("https://custom-model.example/v1/chat/completions", {
      method: "POST",
      body: "synthetic-prompt",
      redirect: "follow",
    });
    expect(transport).toHaveBeenCalledOnce();
    const [sentUrl, sentInit] = transport.mock.calls[0]!;
    expect(String(sentUrl)).toBe("https://custom-model.example/v1/chat/completions");
    await expect(new Request(sentUrl, sentInit).text()).resolves.toBe("synthetic-prompt");
    // 外部地址仍可重定向，但逐跳执行策略，不能把后续跳转留给底层自动跟随。
    expect(sentInit?.redirect).toBe("manual");
    const createDispatcher = vi.fn(async () => ({ close: async () => {} }));
    const fetchWithDispatcher = vi.fn(async () => new Response("ok"));
    const network = createHostApiNetworkTransport(
      async () => ({ httpProxy: "http://127.0.0.1:8888" }),
      { createDispatcher, fetchWithDispatcher },
    );
    await network.fetch("https://custom-model.example/v1/models");
    expect(createDispatcher).toHaveBeenCalledOnce();
    expect(fetchWithDispatcher).toHaveBeenCalledOnce();
    await network.disposeAndWait();
  });

  it("telemetry never reads identity or sends events", async () => {
    const fetchImpl = vi.fn();
    const loadUserId = vi.fn();
    const context: TelemetryRendererContext = {
      clientTimezone: "UTC",
      clientLanguage: "en",
      screenResolution: "1x1",
    };
    const core = createTelemetryCore({ fetchImpl, loadUserId });
    await core.reportEvent({
      context,
      elementName: "synthetic",
      eventRegion: "test",
      eventType: "test",
      eventExtraDetail: { content: "synthetic-private-content" },
    });
    await core.reportAppLaunch(context);
    await core.reportAppDailyActive(context);
    await core.flushPendingReports({ timeoutMs: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(loadUserId).not.toHaveBeenCalled();
  });

  it("share and feedback cannot read authentication or transmit through injected APIs", async () => {
    const request = vi.fn();
    const tokenProvider = vi.fn();
    const getAuthHeaders = vi.fn();
    const share = new ConversationShareHttpClient({
      apiClient: { request },
      baseUrl: "http://127.0.0.1:8000",
      tokenProvider,
    });
    const feedback = new FeedbackHttpClient({
      apiClient: { request },
      baseUrl: "http://127.0.0.1:8000",
      getAuthHeaders,
    });
    await expect(share.getCapabilities()).rejects.toMatchObject({ code: "PRIVACY_RESTRICTION" });
    await expect(feedback.list()).rejects.toMatchObject({ code: "PRIVACY_RESTRICTION" });
    await expect(
      feedback.uploadFile("test", "log", "does-not-exist", "test.zip", "application/zip"),
    ).rejects.toMatchObject({ code: "PRIVACY_RESTRICTION" });
    expect(request).not.toHaveBeenCalled();
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(getAuthHeaders).not.toHaveBeenCalled();
  });

  it("keeps legacy API credential behavior without a new secret requirement", () => {
    const cipher = createCredentialCipherProvider({ env: {} });
    const encrypted = cipher.encrypt("synthetic-secret");
    expect(cipher.decrypt(encrypted)).toBe("synthetic-secret");
    expect(cipher.decrypt("synthetic-plaintext-key")).toBe("synthetic-plaintext-key");
  });
});

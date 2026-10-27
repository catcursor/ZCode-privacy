import { describe, expect, it, vi } from "vitest";
import type { WebRequest, OnBeforeRequestListenerDetails } from "electron";
import { installChromiumZhipuLoopbackPolicy } from "../src/main/privacyNetwork.js";

type Listener = NonNullable<Parameters<WebRequest["onBeforeRequest"]>[1]>;

function harness() {
  let active: Listener;
  const register = vi.fn((_filter: unknown, listener: Listener) => {
    active = listener;
  });
  const source = { onBeforeRequest: register } as unknown as Pick<WebRequest, "onBeforeRequest">;
  const request = (url: string) => {
    const callback = vi.fn();
    active({ url } as OnBeforeRequestListenerDetails, callback);
    return callback;
  };
  return { source, request, register };
}

describe("Chromium vendor loopback enforcement", () => {
  it("maps HTTP and WebSocket requests immediately for every installed session", () => {
    const first = harness();
    const second = harness();
    for (const item of [first, second]) {
      installChromiumZhipuLoopbackPolicy(item.source);
      expect(item.request("https://cdn-zcode.z.ai/icon.png")).toHaveBeenCalledWith({
        redirectURL: "https://127.0.0.1/icon.png",
      });
      expect(item.request("wss://zcode.z.ai/ws")).toHaveBeenCalledWith({
        redirectURL: "wss://127.0.0.1/ws",
      });
      expect(item.request("https://api.openai.com/v1")).toHaveBeenCalledWith({});
    }
  });

  it("survives replacement/removal and keeps original listener filters and callbacks", () => {
    const item = harness();
    installChromiumZhipuLoopbackPolicy(item.source);
    const sandbox = vi.fn(
      (_details: OnBeforeRequestListenerDetails, callback: Parameters<Listener>[1]) =>
        callback({ cancel: true }),
    );
    item.source.onBeforeRequest({ urls: ["https://sandbox.example/*"] }, sandbox);
    expect(item.request("https://sandbox.example/asset")).toHaveBeenCalledWith({ cancel: true });
    expect(sandbox).toHaveBeenCalledTimes(1);
    expect(item.request("https://unrelated.example/asset")).toHaveBeenCalledWith({});
    expect(sandbox).toHaveBeenCalledTimes(1);
    expect(item.request("https://chat.z.ai/login")).toHaveBeenCalledWith({
      redirectURL: "https://127.0.0.1/login",
    });
    expect(sandbox).toHaveBeenCalledTimes(1);
    item.source.onBeforeRequest(null);
    expect(item.request("https://open.bigmodel.cn/messages")).toHaveBeenCalledWith({
      redirectURL: "https://127.0.0.1/messages",
    });
    const before = item.register.mock.calls.length;
    installChromiumZhipuLoopbackPolicy(item.source);
    expect(item.register).toHaveBeenCalledTimes(before);
  });
});

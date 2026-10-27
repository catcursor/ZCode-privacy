import { describe, expect, it, vi } from "vitest";
import {
  buildZhipuHostResolverRules,
  isZhipuHostname,
  rewriteZhipuUrl,
} from "../src/privacyNetwork.js";
import { createZhipuLoopbackFetch } from "../src/privacyFetch.js";

describe("Zhipu loopback network policy", () => {
  it("covers Chromium DNS prefetch without replacing DNS for unrelated hosts", () => {
    const rules = buildZhipuHostResolverRules().split(", ");
    expect(rules).toContain("MAP z.ai 127.0.0.1");
    expect(rules).toContain("MAP *.z.ai 127.0.0.1");
    expect(rules).toContain("MAP zhipu-ai.feishu.cn 127.0.0.1");
    expect(rules).not.toContain("MAP * 127.0.0.1");
    expect(rules.every((rule) => !rule.includes("api.openai.com"))).toBe(true);
  });
  it.each([
    "z.ai",
    "API.Z.AI.",
    "future.cdn.z.ai",
    "open.bigmodel.cn",
    "cdn.codegeex.cn",
    "z-cdn.chatglm.cn",
    "zcode.ai",
    "src.zhipuai.cn",
    "www.zhipuai.com",
    "zhipu.cn",
    "zhipu.ai",
    "zhipu-ai.feishu.cn",
  ])("maps vendor host %s without DNS", (host) => {
    expect(isZhipuHostname(host)).toBe(true);
    expect(rewriteZhipuUrl(`https://${host}:9443/path?q=1#fragment`)).toBe(
      "https://127.0.0.1:9443/path?q=1#fragment",
    );
  });

  it.each([
    "api.openai.com",
    "api.anthropic.com",
    "api.deepseek.com",
    "127.0.0.1",
    "localhost",
    "z.ai.example.com",
    "notbigmodel.cn",
    "zhipu-ai.feishu.cn.example.com",
    "open.feishu.cn",
  ])("leaves unrelated host %s unchanged", (host) => {
    const url = `https://${host}/v1`;
    expect(isZhipuHostname(host)).toBe(false);
    expect(rewriteZhipuUrl(url)).toBe(url);
  });

  it("keeps websocket schemes and does not interpret relative text as a host", () => {
    expect(rewriteZhipuUrl("wss://zcode.z.ai/ws?mid=example")).toBe(
      "wss://127.0.0.1/ws?mid=example",
    );
    expect(rewriteZhipuUrl("//cdn-zcode.z.ai/icon.png")).toBe("//127.0.0.1/icon.png");
    expect(rewriteZhipuUrl("/files/z.ai.txt")).toBe("/files/z.ai.txt");
    expect(rewriteZhipuUrl("not a URL")).toBe("not a URL");
  });

  it("maps Request objects before a proxy sees them and preserves POST content", async () => {
    const seen: Array<{ url: string; text: string; dispatcher: unknown }> = [];
    const send = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      seen.push({
        url: request.url,
        text: await request.text(),
        dispatcher: Reflect.get(init ?? {}, "dispatcher"),
      });
      return new Response("ok");
    });
    const fetch = createZhipuLoopbackFetch(send);
    const proxyOptions: RequestInit & { dispatcher: object } = {
      dispatcher: { proxy: "synthetic" },
    };
    await fetch(
      new Request("https://api.z.ai/messages", { method: "POST", body: "synthetic-body" }),
      proxyOptions,
    );
    expect(seen).toEqual([
      { url: "https://127.0.0.1/messages", text: "synthetic-body", dispatcher: undefined },
    ]);
  });

  it("filters every redirect hop, strips cross-origin credentials, and converts POST after 303", async () => {
    const seen: Request[] = [];
    const send = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      seen.push(new Request(input, init));
      return seen.length === 1
        ? new Response(null, { status: 302, headers: { location: "/second" } })
        : seen.length === 2
          ? new Response(null, { status: 303, headers: { location: "https://zcode.z.ai/result" } })
          : new Response("ok");
    });
    const result = await createZhipuLoopbackFetch(send)("https://safe.example/start", {
      method: "POST",
      body: "synthetic",
      headers: { authorization: "synthetic", cookie: "synthetic" },
    });
    expect(seen.map((request) => request.url)).toEqual([
      "https://safe.example/start",
      "https://safe.example/second",
      "https://127.0.0.1/result",
    ]);
    expect(seen[2]?.method).toBe("GET");
    expect(seen[2]?.headers.has("authorization")).toBe(false);
    expect(seen[2]?.headers.has("cookie")).toBe(false);
    expect(result.redirected).toBe(true);
  });

  it("replays a 307 POST and respects manual redirects and cancellation", async () => {
    const bodies: string[] = [];
    const send = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      bodies.push(await request.text());
      return bodies.length === 1
        ? new Response(null, {
            status: 307,
            headers: { location: "https://open.bigmodel.cn/next" },
          })
        : new Response("ok");
    });
    await createZhipuLoopbackFetch(send)("https://safe.example/start", {
      method: "POST",
      body: "synthetic",
    });
    expect(bodies).toEqual(["synthetic", "synthetic"]);
    const manual = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "https://z.ai/" } }),
    );
    expect(
      (await createZhipuLoopbackFetch(manual)("https://safe.example", { redirect: "manual" }))
        .status,
    ).toBe(302);
    expect(manual).toHaveBeenCalledTimes(1);
    const controller = new AbortController();
    controller.abort();
    const canceled = vi.fn(async () => new Response("unexpected"));
    await expect(
      createZhipuLoopbackFetch(canceled)("https://z.ai", { signal: controller.signal }),
    ).rejects.toThrow();
    expect(canceled).not.toHaveBeenCalled();
  });

  it("keeps unrelated proxy dispatchers and bounds redirect loops", async () => {
    const dispatcher = { proxy: "synthetic" };
    const send = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(Reflect.get(init ?? {}, "dispatcher")).toBe(dispatcher);
      return new Response("ok");
    });
    const proxyOptions: RequestInit & { dispatcher: object } = { dispatcher };
    await createZhipuLoopbackFetch(send)("https://api.openai.com/v1", proxyOptions);
    const loop = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "/again" } }),
    );
    await expect(createZhipuLoopbackFetch(loop)("https://safe.example/start")).rejects.toThrow(
      /redirect limit/u,
    );
    expect(loop).toHaveBeenCalledTimes(21);
    const rejected = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "https://z.ai/" } }),
    );
    await expect(
      createZhipuLoopbackFetch(rejected)("https://safe.example", { redirect: "error" }),
    ).rejects.toThrow();
    expect(rejected).toHaveBeenCalledTimes(1);
  });
});

import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStaticProviderEndpointRoutingPort } from "../src/model/official-coding-plan-gateway.js";
import { createProviderEndpointRoutingFetch } from "../src/model/provider-endpoint-routing-fetch.js";

const SOURCE = "https://open.bigmodel.cn/api/anthropic/v1/messages";
const ORIGIN = "https://gateway.example.test";
const TARGET_PATH = "/api/anthropic/v1/messages";

afterEach(() => vi.unstubAllGlobals());

describe("static provider endpoint routing", () => {
  it.each([
    [SOURCE, `https://127.0.0.1${TARGET_PATH}`],
    ["https://OPEN.BIGMODEL.CN:443/api/anthropic/v1/messages/", `https://127.0.0.1${TARGET_PATH}/`],
    ["https://api.z.ai/api/anthropic/v1/messages", `https://127.0.0.1${TARGET_PATH}`],
    ["http://open.bigmodel.cn/api/anthropic/v1/messages", `http://127.0.0.1${TARGET_PATH}`],
    ["https://open.bigmodel.cn:444/api/anthropic/v1/messages", `https://127.0.0.1:444${TARGET_PATH}`],
    ["https://sub.open.bigmodel.cn/api/anthropic/v1/messages/count_tokens", `https://127.0.0.1${TARGET_PATH}/count_tokens`],
  ])("routes %s with query preserved and no configuration IO", async (source, target) => {
    const network = vi.fn(() => {
      throw new Error("unexpected configuration request");
    });
    vi.stubGlobal("fetch", network);
    const port = createStaticProviderEndpointRoutingPort(ORIGIN);
    await expect(port.resolve(`${source}?id=a%2Bb&empty=`)).resolves.toEqual({
      routed: true,
      url: `${target}?id=a%2Bb&empty=`,
    });
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "http://127.0.0.1:8000/api/anthropic/v1/messages",
    "https://api.openai.com/v1/responses",
    "https://open.bigmodel.cn.example.com/api/anthropic/v1/messages",
    "https://provider.example.test/api/anthropic/v1/messages",
    "not a URL",
  ])("leaves unmatched endpoint %s unchanged", async (url) => {
    await expect(createStaticProviderEndpointRoutingPort(ORIGIN).resolve(url)).resolves.toEqual({
      routed: false,
      url,
    });
  });

  it.each(["string", "URL", "Request"])("uses the common transport with %s input", async (kind) => {
    const controller = new AbortController();
    const body = JSON.stringify({ stream: true, model: "example" });
    const init = {
      method: "POST",
      body,
      signal: controller.signal,
      headers: {
        Host: "open.bigmodel.cn",
        Authorization: "Bearer example",
        "x-api-key": "example-key",
      },
    };
    const response = new Response("data: first\n\ndata: second\n\n", { status: 200 });
    let sent: Request | undefined;
    const transport = createProviderEndpointRoutingFetch({
      routingPort: createStaticProviderEndpointRoutingPort(ORIGIN),
      fetch: async (input, options) => {
        sent = new Request(input, options);
        return response;
      },
    });
    const input =
      kind === "Request" ? new Request(SOURCE, init) : kind === "URL" ? new URL(SOURCE) : SOURCE;
    expect(await transport(input, kind === "Request" ? undefined : init)).toBe(response);
    expect(sent?.url).toBe(`https://127.0.0.1${TARGET_PATH}`);
    expect(sent?.method).toBe("POST");
    expect(sent?.headers.get("host")).toBeNull();
    expect(sent?.headers.get("authorization")).toBe("Bearer example");
    expect(sent?.headers.get("x-api-key")).toBe("example-key");
    await expect(sent?.text()).resolves.toBe(body);
    controller.abort();
    expect(sent?.signal.aborted).toBe(true);
    await expect(response.text()).resolves.toBe("data: first\n\ndata: second\n\n");
  });

  it("sends to actual loopback with the original port/path instead of the supplied gateway", async () => {
    const received: Array<{
      url: string;
      host: string | undefined;
      auth: string | undefined;
      body: string;
    }> = [];
    const server = http.createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        url: request.url!,
        host: request.headers.host,
        auth: request.headers.authorization,
        body: Buffer.concat(chunks).toString(),
      });
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end("data: complete\n\n");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const fetch = createProviderEndpointRoutingFetch({
        routingPort: createStaticProviderEndpointRoutingPort(ORIGIN),
        fetch: globalThis.fetch,
      });
      const response = await fetch(`http://open.bigmodel.cn:${new URL(origin).port}${TARGET_PATH}?stream=true`, {
        method: "POST",
        body: "request-body",
        headers: { Host: "open.bigmodel.cn", Authorization: "Bearer example" },
      });
      expect(await response.text()).toBe("data: complete\n\n");
      expect(received).toEqual([
        {
          url: `${TARGET_PATH}?stream=true`,
          host: new URL(origin).host,
          auth: "Bearer example",
          body: "request-body",
        },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});

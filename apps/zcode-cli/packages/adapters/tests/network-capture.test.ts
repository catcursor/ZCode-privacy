import { createServer, request, type Server } from "node:http";
import { once } from "node:events";
import { expect, it, vi } from "vitest";
import { createNodeNetworkCapture, withoutNetworkCapture } from "@zcode/shared/node";
import type { NetworkCaptureBatch } from "@zcode/shared";
import { createNetworkProxyFetch } from "../src/network/proxy-fetch.js";
import { createMcpTransportFetch } from "../src/mcp/network.js";

async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

it("公网目标经代理、回环目标直连，目标只记一条，MCP 直连和代理均排除", async () => {
  const upstream = createServer((_req, res) => res.end("unchanged"));
  const target = await listen(upstream);
  const publicTarget = target.replace("127.0.0.1", "model.example");
  let forwarded = 0;
  const proxy = createServer((req, res) =>
    withoutNetworkCapture(() => {
      forwarded++;
      const destination = new URL(req.url!);
      destination.hostname = "127.0.0.1";
      const outgoing = request(destination, { method: req.method }, (response) => response.pipe(res));
      outgoing.on("error", () => res.destroy());
      req.pipe(outgoing);
    }),
  );
  const httpProxy = await listen(proxy);
  const original = globalThis.fetch;
  const batches: NetworkCaptureBatch[] = [];
  const capture = createNodeNetworkCapture("cli", (batch) => batches.push(batch));
  capture.setCaptureId("cli-proxy");
  try {
    const proxyFetch = createNetworkProxyFetch({ env: {}, httpProxy });
    expect(await (await proxyFetch(`${publicTarget}/proxy?key=secret`)).text()).toBe("unchanged");
    expect(forwarded).toBe(1);
    const bypass = createNetworkProxyFetch({ env: {}, httpProxy, noProxy: "127.0.0.1" });
    expect(await (await bypass(`${target}/bypass`)).text()).toBe("unchanged");
    expect(forwarded).toBe(1);
    await (await createMcpTransportFetch({ env: {} })(`${target}/mcp-direct`)).text();
    await (
      await createMcpTransportFetch({ env: {}, network: { httpProxy } })(`${publicTarget}/mcp-proxy`)
    ).text();
    expect(forwarded).toBe(2);
    await vi.waitFor(() => expect(batches.flatMap((batch) => batch.records)).toHaveLength(2));
    const records = batches.flatMap((batch) => batch.records);
    expect(records.map((record) => record.url)).toEqual([
      `${publicTarget}/proxy?key=%5Bredacted%5D`,
      `${target}/bypass`,
    ]);
    expect(globalThis.fetch).toBe(original);
  } finally {
    capture.setCaptureId(null);
    await close(proxy);
    await close(upstream);
  }
});

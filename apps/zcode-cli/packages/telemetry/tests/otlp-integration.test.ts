import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { createOwnedAgentTelemetryRuntime } from "../src/otlp-exporter.js";

// 原 gzip/OTLP 上传契约在此 fork 已删除；真实接收器证明不会发送任何请求。
describe("privacy edition OTLP boundary", () => {
  it("never sends to an explicitly configured local collector", async () => {
    let requests = 0;
    const server = createServer((_request, response) => { requests += 1; response.end(); });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const endpoint = `http://127.0.0.1:${address.port}`;
      const owner = createOwnedAgentTelemetryRuntime({ endpoint, metricEndpoint: endpoint, headers: { authorization: "synthetic-key" }, resource: { serviceName: "synthetic", cliVersion: "test", runtimeDistribution: "standalone", runtimeSurface: "cli", installationId: "synthetic-device", serviceInstanceId: "synthetic-instance" } });
      expect(owner.enabled).toBe(false);
      await owner.flush();
      await owner.shutdown();
      expect(requests).toBe(0);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

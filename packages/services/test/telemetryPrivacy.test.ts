import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { createTelemetryCore } from "../src/telemetry/telemetryCore.js";
it("never sends private events to a real local collector", async () => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing port");
    const core = createTelemetryCore({
      resolveZCodeEndpointOrigin: () => `http://127.0.0.1:${address.port}`,
    });
    await core.reportEvent({
      context: { clientTimezone: "UTC", clientLanguage: "en", screenResolution: "1x1" },
      elementName: "app_login_ck",
      eventRegion: "app",
      eventType: "test",
      eventExtraDetail: { login_url: "https://login.example?token=synthetic-secret" },
    });
    await core.flushPendingReports({ timeoutMs: 1 });
    expect(requests).toBe(0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

import { describe, expect, it, vi } from "vitest";
import { createTelemetryCore } from "../src/telemetry/telemetryCore.js";
describe("privacy edition has no reporting retry queue", () => {
  it("finishes concurrent reports without calling a failing transport, clock or retry timer", async () => {
    const fetchImpl = vi.fn(async () => {
        throw new Error("network unavailable");
      }),
      sleep = vi.fn(),
      now = vi.fn();
    const core = createTelemetryCore({ fetchImpl, sleep, now });
    const context = { clientTimezone: "UTC", clientLanguage: "en", screenResolution: "1x1" };
    await Promise.all(Array.from({ length: 20 }, () => core.reportAppDailyActive(context)));
    await core.flushPendingReports({ timeoutMs: 1 });
    for (const spy of [fetchImpl, sleep, now]) expect(spy).not.toHaveBeenCalled();
  });
});

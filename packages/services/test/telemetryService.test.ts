import { describe, expect, it, vi } from "vitest";
import { createTelemetryCore } from "../src/telemetry/telemetryCore.js";
describe("privacy edition service reporting", () => {
  it("ignores event, launch and daily-active reporting without reading identity or authorization", async () => {
    const fetchImpl = vi.fn(),
      loadUserId = vi.fn(),
      loadAuthorization = vi.fn(),
      loadMarketingParams = vi.fn();
    const core = createTelemetryCore({
      fetchImpl,
      loadUserId,
      loadAuthorization,
      loadMarketingParams,
    });
    const context = { clientTimezone: "UTC", clientLanguage: "en", screenResolution: "1x1" };
    await core.reportEvent({
      context,
      elementName: "synthetic",
      eventType: "test",
      eventRegion: "test",
      eventExtraDetail: { content: "synthetic-secret" },
    });
    await core.reportAppLaunch(context);
    await core.reportAppDailyActive(context);
    await core.flushPendingReports({ timeoutMs: 1 });
    for (const spy of [fetchImpl, loadUserId, loadAuthorization, loadMarketingParams])
      expect(spy).not.toHaveBeenCalled();
  });
});

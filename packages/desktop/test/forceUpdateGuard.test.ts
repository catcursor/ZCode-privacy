import { expect, it, vi } from "vitest";
import {
  maybeBlockStartupForForceUpdate,
  resolveDesktopForceUpdateRequirement,
  resolveForceUpdateClientConfigUrl,
  formatForceUpdateDialogText,
} from "../src/main/forceUpdateGuard.js";
it("never fetches mandatory update policy or blocks startup", async () => {
  const fetchRemoteConfig = vi.fn(),
    requestAutoUpdate = vi.fn(),
    logger = { info: vi.fn(), warn: vi.fn() };
  expect(await resolveDesktopForceUpdateRequirement({ logger, fetchRemoteConfig })).toBeNull();
  expect(
    await maybeBlockStartupForForceUpdate({
      locale: "en-US",
      logger,
      fetchRemoteConfig,
      requestAutoUpdate,
    }),
  ).toEqual({ blocked: false });
  expect(fetchRemoteConfig).not.toHaveBeenCalled();
  expect(requestAutoUpdate).not.toHaveBeenCalled();
});
it("keeps pure compatibility formatting without performing an update", () => {
  expect(new URL(resolveForceUpdateClientConfigUrl("https://example.com")).pathname).toBe(
    "/api/v1/client/configs",
  );
  expect(
    formatForceUpdateDialogText({ currentVersion: "1.0.0", minimalVersion: "2.0.0" }, "en-US")
      .title,
  ).toBe("Update ZCode");
});

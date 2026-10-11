import { expect, it, vi } from "vitest";
import {
  configureDesktopMcpTelemetry,
  reportMcpTelemetryToArms,
} from "../src/main/desktopMcpTelemetry.js";
it("does not inspect MCP configuration or events for reporting", () => {
  const read = vi.fn(() => {
    throw new Error("private MCP data");
  });
  configureDesktopMcpTelemetry(
    new Proxy({} as Parameters<typeof configureDesktopMcpTelemetry>[0], { get: read }),
  );
  reportMcpTelemetryToArms(
    new Proxy({} as Parameters<typeof reportMcpTelemetryToArms>[0], { get: read }),
    "local",
  );
  expect(read).not.toHaveBeenCalled();
});

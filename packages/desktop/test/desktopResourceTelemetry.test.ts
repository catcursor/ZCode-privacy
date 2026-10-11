import { expect, it, vi } from "vitest";
vi.mock("electron", () => ({ BrowserWindow: { getAllWindows: () => [] } }));
vi.mock("../src/main/desktopRuntimeEnv.js", () => ({ desktopRuntimeEnv: "development" }));
import {
  configureDesktopResourceTelemetry,
  registerDesktopResourceTelemetry,
  ingestToolExecResource,
  stopDesktopResourceTelemetry,
  resolveResourceUsageScene,
} from "../src/main/desktopResourceTelemetry.js";
it("does not sample resources, inspect completion data or schedule reporting", () => {
  const timer = vi.spyOn(globalThis, "setInterval"),
    read = vi.fn(() => {
      throw new Error("private completion");
    });
  configureDesktopResourceTelemetry(
    new Proxy({} as Parameters<typeof configureDesktopResourceTelemetry>[0], { get: read }),
  );
  registerDesktopResourceTelemetry({ info: vi.fn(), warn: vi.fn() });
  ingestToolExecResource(new Proxy({}, { get: read }), "local");
  stopDesktopResourceTelemetry({ flushPendingWindows: true });
  expect(timer).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
  expect(resolveResourceUsageScene()).toBe("background");
  timer.mockRestore();
});

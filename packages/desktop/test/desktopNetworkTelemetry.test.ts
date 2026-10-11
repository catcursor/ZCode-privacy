import { expect, it, vi } from "vitest";
vi.mock("../src/main/desktopRuntimeEnv.js", () => ({ desktopRuntimeEnv: "development" }));
import {
  configureDesktopNetworkTelemetry,
  registerDesktopNetworkTelemetry,
  ingestArmsApiEventsFromBatch,
  ingestHostNetworkObservations,
  noteWebRemoteRelayConnectAttempt,
  noteWebRemoteRelayReconnect,
  stopDesktopNetworkTelemetry,
} from "../src/main/desktopNetworkTelemetry.js";
it("does not inspect observations or schedule network reporting", () => {
  const timer = vi.spyOn(globalThis, "setInterval"),
    read = vi.fn(() => {
      throw new Error("private observation");
    });
  configureDesktopNetworkTelemetry(
    new Proxy({} as Parameters<typeof configureDesktopNetworkTelemetry>[0], { get: read }),
  );
  registerDesktopNetworkTelemetry({ info: vi.fn(), warn: vi.fn() });
  ingestArmsApiEventsFromBatch(new Proxy([], { get: read }));
  ingestHostNetworkObservations(new Proxy([], { get: read }));
  noteWebRemoteRelayConnectAttempt(1, false);
  noteWebRemoteRelayReconnect();
  stopDesktopNetworkTelemetry();
  expect(timer).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
  timer.mockRestore();
});

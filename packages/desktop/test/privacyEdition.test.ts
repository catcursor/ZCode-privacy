import { describe, expect, it, vi } from "vitest";
import { DISABLED_RENDERER_ACTION_TRACE_CONFIG } from "@zcode/shared";
import {
  createRendererActionTraceExporter,
  resolveRendererActionTraceEndpoint,
} from "../src/main/rendererActionTraceExporter.js";
import { createRendererActionTraceBroker } from "../src/main/rendererActionTraceBroker.js";
import { createRendererActionTraceRollout } from "../src/main/rendererActionTraceRollout.js";
import { createLocalTtftExporter } from "../src/main/localTtftExporter.js";
import {
  initArmsBrowserRumOnce,
  scheduleArmsBrowserRumInit,
} from "../src/shared/armsBrowserInit.js";
import { createElectronDesktopContextPromptConfigFetcher } from "../src/main/desktopContextPromptRollout.js";

const mocks = vi.hoisted(() => ({
  updater: {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: true,
  },
  ipcHandle: vi.fn(),
  appOn: vi.fn(),
  prompt: vi.fn(),
}));
vi.mock("electron", () => ({
  app: { isPackaged: true, getVersion: () => "3.15.1", getAppPath: () => "test", on: mocks.appOn },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: mocks.ipcHandle, on: vi.fn() },
  Menu: { getApplicationMenu: () => null },
}));
vi.mock("electron-updater", () => ({
  default: { autoUpdater: mocks.updater, CancellationToken: class {} },
}));
vi.mock("../src/main/manifestUpdateProvider.js", () => ({
  ManifestUpdateProvider: class {},
  getElectronReleasePlatform: () => "win-x64",
}));
vi.mock("../src/main/forceUpdatePrompt.js", () => ({ showForceUpdatePrompt: mocks.prompt }));
vi.mock("../src/main/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  initAutoUpdater,
  getAutoUpdaterState,
  requestForceAutoUpdate,
  downloadAvailableUpdate,
  refreshAutoUpdaterReleaseChannel,
  hydratePendingPostUpdateReleaseNotes,
} from "../src/main/autoUpdater.js";
import { maybeBlockStartupForForceUpdate } from "../src/main/forceUpdateGuard.js";

const endpointEnv = {
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example",
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://collector.example/traces",
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://collector.example/metrics",
};

describe("privacy edition desktop boundaries", () => {
  it("ignores trace endpoints and injected exporters before inspecting a batch", async () => {
    expect(resolveRendererActionTraceEndpoint(endpointEnv)).toBeUndefined();
    expect(createRendererActionTraceExporter(endpointEnv)).toBeUndefined();
    const exporter = { export: vi.fn(), shutdown: vi.fn(async () => {}) };
    const broker = createRendererActionTraceBroker({
      exporter,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });
    const privateBatch = {
      toJSON: () => {
        throw new Error("must not serialize private input");
      },
    };
    expect(broker.enqueue(privateBatch)).toBe(false);
    await broker.flush();
    await broker.shutdown();
    expect(exporter.export).not.toHaveBeenCalled();
    expect(exporter.shutdown).not.toHaveBeenCalled();
  });

  it("disables TTFT export without inspecting records or creating a meter", async () => {
    const exporter = createLocalTtftExporter({
      env: endpointEnv,
      version: "test",
      logger: { warn: vi.fn() },
    });
    exporter.enqueue({
      toJSON: () => {
        throw new Error("private input");
      },
    });
    await exporter.shutdown();
  });

  it("keeps renderer tracing disabled without fetching remote rollout flags", async () => {
    const fetchConfig = vi.fn();
    const rollout = createRendererActionTraceRollout({ fetchConfig, logger: { warn: vi.fn() } });
    expect(rollout.getSnapshot()).toEqual(DISABLED_RENDERER_ACTION_TRACE_CONFIG);
    expect(await rollout.refresh()).toEqual(DISABLED_RENDERER_ACTION_TRACE_CONFIG);
    expect(await rollout.awaitFirstDecision(1)).toEqual(DISABLED_RENDERER_ACTION_TRACE_CONFIG);
    expect(fetchConfig).not.toHaveBeenCalled();
    const resolveEndpointOrigin = vi.fn();
    const fetcher = createElectronDesktopContextPromptConfigFetcher({
      deviceMid: "synthetic-device",
      appVersion: "test",
      resolveEndpointOrigin,
    });
    await fetcher(new AbortController().signal);
    expect(resolveEndpointOrigin).not.toHaveBeenCalled();
  });

  it("does not initialize a browser SDK or schedule telemetry retry timers", () => {
    const timer = vi.spyOn(globalThis, "setTimeout");
    expect(initArmsBrowserRumOnce("production")).toBe(true);
    scheduleArmsBrowserRumInit("production");
    expect(timer).not.toHaveBeenCalled();
    timer.mockRestore();
  });

  it("disables updates even before initialization and with explicitly enabled settings", async () => {
    const settings = {
      get: vi.fn(async () => ({ recentProjects: [], autoDownloadAndInstallUpdates: true })),
      update: vi.fn(async () => {}),
    };
    const states = vi.fn();
    requestForceAutoUpdate(states);
    downloadAvailableUpdate();
    await initAutoUpdater({ enabled: true, settingService: settings });
    await hydratePendingPostUpdateReleaseNotes(settings);
    refreshAutoUpdaterReleaseChannel(true);
    expect(getAutoUpdaterState()).toEqual({ kind: "idle", enabled: false });
    expect(mocks.updater.autoDownload).toBe(false);
    expect(mocks.updater.autoInstallOnAppQuit).toBe(false);
    expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
    expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled();
    expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled();
    expect(mocks.updater.setFeedURL).not.toHaveBeenCalled();
    expect(mocks.ipcHandle).not.toHaveBeenCalled();
    expect(settings.get).not.toHaveBeenCalled();
  });

  it("never checks or blocks startup for a mandatory update", async () => {
    const fetchRemoteConfig = vi.fn();
    const requestAutoUpdate = vi.fn();
    const result = await maybeBlockStartupForForceUpdate({
      locale: "en-US",
      logger: { info: vi.fn(), warn: vi.fn() },
      fetchRemoteConfig,
      requestAutoUpdate,
    });
    expect(result).toEqual({ blocked: false });
    expect(fetchRemoteConfig).not.toHaveBeenCalled();
    expect(requestAutoUpdate).not.toHaveBeenCalled();
    expect(mocks.prompt).not.toHaveBeenCalled();
  });
});

import { expect, it, vi } from "vitest";
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
}));
vi.mock("electron", () => ({
  app: { isPackaged: true, getVersion: () => "3.15.1", getAppPath: () => "test", on: mocks.appOn },
  BrowserWindow: { getAllWindows: () => [], getFocusedWindow: () => null },
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
  requestAutoUpdateCheckWithoutWindow,
  checkForUpdateMenuClick,
} from "../src/main/autoUpdater.js";
it("cannot initialize, check, download or install updates through any public entry", async () => {
  const settings = {
    get: vi.fn(async () => ({ recentProjects: [], autoDownloadAndInstallUpdates: true })),
    update: vi.fn(async () => {}),
  };
  requestForceAutoUpdate(vi.fn());
  downloadAvailableUpdate();
  requestAutoUpdateCheckWithoutWindow();
  checkForUpdateMenuClick();
  await initAutoUpdater({ enabled: true, settingService: settings });
  await hydratePendingPostUpdateReleaseNotes(settings);
  refreshAutoUpdaterReleaseChannel(true);
  expect(getAutoUpdaterState()).toEqual({ kind: "idle", enabled: false });
  expect(mocks.updater.autoDownload).toBe(false);
  expect(mocks.updater.autoInstallOnAppQuit).toBe(false);
  for (const fn of [
    mocks.updater.checkForUpdates,
    mocks.updater.downloadUpdate,
    mocks.updater.quitAndInstall,
    mocks.updater.setFeedURL,
    mocks.ipcHandle,
    mocks.appOn,
    settings.get,
  ])
    expect(fn).not.toHaveBeenCalled();
});

import { BrowserWindow } from "electron";
import { mapZCodeEnvToArmsRumEnv, type ProcessResourceRuntimeSurface } from "@zcode/shared";
import { desktopRuntimeEnv } from "./desktopRuntimeEnv.js";

export const RESOURCE_SAMPLE_INTERVAL_MS = 10_000;
export const RESOURCE_REPORT_INTERVAL_MS = desktopRuntimeEnv === "development" ? 60_000 : 300_000;
export const MEMORY_LOG_SAMPLE_EVERY_N_TICKS = 6;

export type ResourceUsageScene = "foreground" | "background";

interface ResourceLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
}

interface ResourceGlobalContext {
  deviceMid: string;
  platform: NodeJS.Platform;
  appVersion: string;
  armsEnv: ReturnType<typeof mapZCodeEnvToArmsRumEnv>;
}

export function resolveResourceUsageScene(): ResourceUsageScene {
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
  if (windows.length === 0) {
    return "background";
  }

  const anyFocused = windows.some((win) => win.isFocused());
  const anyVisible = windows.some((win) => win.isVisible() && !win.isMinimized());
  return anyFocused && anyVisible ? "foreground" : "background";
}

export function ingestToolExecResource(
  _raw: unknown,
  _runtimeSurface: ProcessResourceRuntimeSurface,
): void {
  // 隐私版不采集、不启动上报定时器。
}

export function configureDesktopResourceTelemetry(_context: ResourceGlobalContext): void {
  // 隐私版不采集、不启动上报定时器。
}

export function registerDesktopResourceTelemetry(
  _logger: ResourceLogger,
  /**
   * `reportIntervalMs` 只供单测注入窗口时钟；生产走 RESOURCE_REPORT_INTERVAL_MS。
   * `readSelfClockMs` 只供单测注入可预期的自证开销时钟；生产走 performance.now。
   */
  _options?: { reportIntervalMs?: number; readSelfClockMs?: () => number },
): void {
  // 隐私版不采集、不启动上报定时器。
}

export function stopDesktopResourceTelemetry(_options?: { flushPendingWindows?: boolean }): void {}

/* eslint-disable max-lines -- 网络指标采集/聚合/ARMS 上报 */

import { mapZCodeEnvToArmsRumEnv } from "@zcode/shared";
import type { NetworkObservation } from "@zcode/rpc";

import { desktopRuntimeEnv } from "./desktopRuntimeEnv.js";

/** 与资源指标对齐：开发 1min、生产 5min 聚合上报 */
export const NETWORK_REPORT_INTERVAL_MS = desktopRuntimeEnv === "development" ? 60_000 : 300_000;

interface NetworkLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

interface NetworkGlobalContext {
  deviceMid: string;
  platform: NodeJS.Platform;
  appVersion: string;
  armsEnv: ReturnType<typeof mapZCodeEnvToArmsRumEnv>;
}
let reportTimer: ReturnType<typeof setInterval> | null = null;

export function ingestArmsApiEventsFromBatch(
  _events: Array<Record<string, unknown>> | undefined,
): void {
  // 隐私版不采集、不启动上报定时器。
}

export function ingestHostNetworkObservations(_observations: NetworkObservation[]): void {
  // 隐私版不采集、不启动上报定时器。
}

/** 远控 relay WebSocket：接口维度固定为 web_remote_control.relay */
export const WEB_REMOTE_RELAY_INTERFACE = "web_remote_control.relay";

export function noteWebRemoteRelayConnectAttempt(
  _durationMs: number,
  _ok: boolean,
  _options?: { error?: unknown; attempt?: number },
): void {
  // 隐私版不采集、不启动上报定时器。
}

export function noteWebRemoteRelayReconnect(): void {
  // 隐私版不采集、不启动上报定时器。
}

export function configureDesktopNetworkTelemetry(_context: NetworkGlobalContext): void {
  // 隐私版不采集、不启动上报定时器。
}

export function registerDesktopNetworkTelemetry(_logger: NetworkLogger): void {
  // 隐私版不采集、不启动上报定时器。
}

export function stopDesktopNetworkTelemetry(): void {
  if (reportTimer) {
    clearInterval(reportTimer);
    reportTimer = null;
  }
}

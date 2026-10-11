import type { ZCodeMcpTelemetryEvent } from "@zcode/shared";

interface DesktopMcpTelemetryContext {
  appVersion: string;
  armsEnv: string;
  deviceMid: string;
}

export function configureDesktopMcpTelemetry(_next: DesktopMcpTelemetryContext): void {
  // 隐私版不采集、不启动上报定时器。
}

export function reportMcpTelemetryToArms(
  _event: ZCodeMcpTelemetryEvent,
  _runtimeSurface: "local" | "remote",
): void {
  // 隐私版不采集、不启动上报定时器。
}

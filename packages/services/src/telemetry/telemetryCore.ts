import type {
  TelemetryEventPayload,
  TelemetryRendererContext,
  OAuthLoginAttribution,
} from "@zcode/shared";

interface TelemetryCoreDependencies {
  fetchImpl?: typeof fetch;
  loadUserId?: () => Promise<string>;
  loadAuthorization?: (userId: string) => Promise<string | null>;
  loadMarketingParams?: () => Promise<OAuthLoginAttribution | null>;
  randomUUID?: () => string;
  now?: () => number;
  appVersion?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  releaseChannel?: string;
  osVersion?: string;
  homeDir?: string;
  resolveZCodeEndpointOrigin?: () => Promise<string> | string;
  requestTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  warn?: (message: string) => void;
}

export interface EnsureTelemetryDeviceMidOptions {
  homeDir?: string;
  randomUUID?: () => string;
}

// 兼容调用方，不再为遥测创建持久设备标识或读写状态文件。
export async function ensureTelemetryDeviceMid(
  _options: EnsureTelemetryDeviceMidOptions = {},
): Promise<string> {
  return "privacy-no-reporting";
}

// 即使构建或调用方注入上报地址，也没有采集、鉴权、网络和重试路径。
export function createTelemetryCore(_dependencies: TelemetryCoreDependencies = {}) {
  return {
    async reportEvent(
      _input: TelemetryEventPayload & { context: TelemetryRendererContext },
    ): Promise<void> {},
    async reportAppLaunch(_context: TelemetryRendererContext): Promise<void> {},
    async reportAppDailyActive(_context: TelemetryRendererContext): Promise<void> {},
    async flushPendingReports(_options: { timeoutMs: number }): Promise<void> {},
  };
}

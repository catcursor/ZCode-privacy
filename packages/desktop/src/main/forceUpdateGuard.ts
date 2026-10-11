import {
  DEFAULT_ZCODE_ENDPOINT_ORIGIN,
  ZCODE_VERSION,
  buildZCodeEndpointUrls,
  type ForceUpdateRequirement,
  type Locale,
} from "@zcode/shared";
import type { ForceAutoUpdateState } from "./autoUpdater.js";

const ZCODE_CLIENT_CONFIG_API_PATH = "/api/v1/client/configs";

export interface ForceUpdateDialogText {
  title: string;
  message: string;
  detail: string;
  autoUpdateButton: string;
  manualUpdateButton: string;
  quitButton: string;
}

export interface ForceUpdateGuardLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

export interface ForceUpdateGuardResult {
  blocked: boolean;
  requirement?: ForceUpdateRequirement;
}

export interface ForceUpdateGuardOptions {
  locale: Locale;
  logger: ForceUpdateGuardLogger;
  endpointOrigin?: string;
  fetchRemoteConfig?: () => Promise<unknown>;
  requestAutoUpdate?: (
    onStateChange?: (state: ForceAutoUpdateState) => void,
  ) => (() => void) | void;
  onBlocked?: (requirement: ForceUpdateRequirement) => void;
}

export function resolveForceUpdateClientConfigUrl(
  endpointOrigin = DEFAULT_ZCODE_ENDPOINT_ORIGIN,
): string {
  const url = new URL(
    `${buildZCodeEndpointUrls(endpointOrigin).origin}${ZCODE_CLIENT_CONFIG_API_PATH}`,
  );
  url.searchParams.set("app_version", ZCODE_VERSION);
  url.searchParams.set("platform", `${process.platform}-${process.arch}`);
  return url.toString();
}

export async function resolveDesktopForceUpdateRequirement(_options: {
  logger: ForceUpdateGuardLogger;
  endpointOrigin?: string;
  fetchRemoteConfig?: () => Promise<unknown>;
}): Promise<ForceUpdateRequirement | null> {
  return null;
}

export function resolveForceUpdateDownloadUrl(
  locale: Locale,
  endpointOrigin = DEFAULT_ZCODE_ENDPOINT_ORIGIN,
): string {
  const origin = buildZCodeEndpointUrls(endpointOrigin).origin;
  return locale === "zh-CN" ? `${origin}/cn` : `${origin}/en`;
}

export function formatForceUpdateDialogText(
  requirement: ForceUpdateRequirement,
  locale: Locale,
): ForceUpdateDialogText {
  if (locale === "zh-CN") {
    return {
      title: "需要升级 ZCode",
      message: "当前版本无法继续使用",
      detail: `当前版本：v${requirement.currentVersion}\n最低可用版本：v${requirement.minimalVersion}`,
      autoUpdateButton: "自动升级",
      manualUpdateButton: "手动升级",
      quitButton: "退出",
    };
  }

  return {
    title: "Update ZCode",
    message: "The current version can no longer be used",
    detail: `Current version: v${requirement.currentVersion}\nMinimum supported version: v${requirement.minimalVersion}`,
    autoUpdateButton: "Auto update",
    manualUpdateButton: "Manual update",
    quitButton: "Quit",
  };
}

export async function maybeBlockStartupForForceUpdate(
  _options: ForceUpdateGuardOptions,
): Promise<ForceUpdateGuardResult> {
  return { blocked: false };
}

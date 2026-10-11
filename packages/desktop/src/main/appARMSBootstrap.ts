import { randomUUID } from "node:crypto";
function isCrashReporterEvent(event: Record<string, unknown>): boolean {
  return (
    event.event_type === "exception" && event.type === "crash" && event.source === "crashReporter"
  );
}

function normalizeExecutableName(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/\.exe$/i, "")
    : "";
}

function hasProductExecutable(
  event: Record<string, unknown>,
  applicationName: string,
  runtimeExecutableName?: string,
): boolean {
  // 修复原因：app name 不等于所有运行形态的真实二进制名；开发态使用 Electron，
  // Linux Preview 使用 zcode-preview。两者都必须精确匹配，不能放宽成前缀以免混入 helper dump。
  const expectedNames = new Set(
    [applicationName, runtimeExecutableName].map(normalizeExecutableName).filter(Boolean),
  );
  if (expectedNames.size === 0 || !Array.isArray(event.binary_images)) {
    return false;
  }
  return event.binary_images.some((image) => {
    if (!image || typeof image !== "object") {
      return false;
    }
    return expectedNames.has(normalizeExecutableName((image as Record<string, unknown>).name));
  });
}

type NativeDumpProcessRole = "main" | "renderer" | "utility" | "gpu" | "host" | "agent" | "unknown";

const nativeDumpProcessRoleAliases: Record<string, NativeDumpProcessRole> = {
  main: "main",
  browser: "main",
  main_process: "main",
  renderer: "renderer",
  utility: "utility",
  utility_host: "utility",
  gpu: "gpu",
  host: "host",
  agent: "agent",
};

function readNativeDumpProcessRole(event: Record<string, unknown>): NativeDumpProcessRole {
  const metadata =
    event.meta && typeof event.meta === "object"
      ? (event.meta as Record<string, unknown>)
      : undefined;
  // 修复原因：通用 process_role 可能由事件属性或中间件注入，并不证明来自 Crashpad dump。
  // 只信任依赖补丁从结构化 annotation RVA 提取并写入的 meta.process_type，避免 helper
  // dump 被非结构化 main 标记提升为 app_native_process，污染 Native Crash / Crash-Free。
  const processType = metadata?.process_type;
  if (typeof processType === "string") {
    return nativeDumpProcessRoleAliases[processType.trim().toLowerCase()] ?? "unknown";
  }
  return "unknown";
}

export function filterAndEnrichNativeCrashEvents(
  events: Array<Record<string, unknown>>,
  applicationName: string,
  runtimeExecutableName?: string,
): Array<Record<string, unknown>> {
  return events.filter((event) => {
    if (!isCrashReporterEvent(event)) {
      return true;
    }
    if (!hasProductExecutable(event, applicationName, runtimeExecutableName)) {
      return false;
    }
    const existingProperties =
      event.properties && typeof event.properties === "object"
        ? (event.properties as Record<string, unknown>)
        : {};
    const nativeDumpProcessRole = readNativeDumpProcessRole(event);
    // 根因：binary_images 只能证明 dump 来自产品二进制，不能区分 Linux/Windows 上
    // 共用同一 executable 的主进程、renderer、utility 或 host。未知角色继续保留原始
    // crashReporter 事件，但不得进入 app_native_process，否则会把 helper crash loop
    // 当成应用 native crash 并拉低 Crash-Free。只有明确标记为 main 的 dump 才进入产品 KPI。
    event.properties = {
      ...existingProperties,
      telemetry_schema_version: "2",
      // Bugfix: SDK 重试可能让同一事件再次经过 beforeReport，必须保留事故 ID 才能去重。
      crash_id:
        typeof existingProperties.crash_id === "string"
          ? existingProperties.crash_id
          : randomUUID(),
      crash_scope:
        nativeDumpProcessRole === "main" ? "app_native_process" : "native_dump_unattributed",
      crash_cause: "native_crash",
      crash_source: "crash_reporter_dump",
      native_dump_process_role: nativeDumpProcessRole,
    };
    return true;
  });
}

// 不加载遥测 SDK，不生成设备身份或安装 collector。
export const armsInitPromise: Promise<void> = Promise.resolve();

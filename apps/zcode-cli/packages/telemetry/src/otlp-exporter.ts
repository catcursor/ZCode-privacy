import { AggregationType, type ViewOptions } from "@opentelemetry/sdk-metrics";
import { ParentBasedSampler, TraceIdRatioBasedSampler, type Sampler } from "@opentelemetry/sdk-trace-base";
import { TELEMETRY_SCHEMA_VERSION, type AgentTelemetryRuntimeOwner, type TelemetryIdentitySnapshot, type TelemetryResourceContext } from "@zcode/contracts/telemetry";
import { NoopAgentExecutionTelemetry } from "./agent-trace-runtime.js";

export const AGENT_METRIC_EXPORT_INTERVAL_MS = 300_000;
export const AGENT_TRACE_SAMPLE_RATIO = 0.1;

export interface CreateOwnedAgentTelemetryRuntimeOptions {
  endpoint: string;
  headers?: Record<string, string>;
  identity?: TelemetryIdentitySnapshot;
  maxBatchSize?: number;
  maxQueueSize?: number;
  metricEndpoint?: string;
  metricExportIntervalMs?: number;
  metricHeaders?: Record<string, string>;
  onWarning?: (message: string, context: Record<string, unknown>) => void;
  resource: TelemetryResourceContext;
  timeoutMs?: number;
  traceSampleRatio?: number;
}

// 保留本地契约辅助函数；导出器创建入口固定返回无上报 Owner。
export function createOwnedAgentTelemetryRuntime(
  _options: CreateOwnedAgentTelemetryRuntimeOptions,
): AgentTelemetryRuntimeOwner {
  const execution = new NoopAgentExecutionTelemetry();
  return { agentExecution: execution, modelExecution: execution, enabled: false, abandonSession() {}, async flush() {}, async shutdown() {}, updateIdentity() {} };
}

export function createAgentTraceSampler(ratio = AGENT_TRACE_SAMPLE_RATIO): Sampler {
  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(ratio),
  });
}

export function metricViews(): ViewOptions[] {
  return [
    histogramView("zcode.agent.turn.duration", [1, 5, 10, 30, 60, 300, 600]),
    histogramView("zcode.model.*.duration", [0.25, 1, 2, 5, 10, 30, 60, 120]),
    histogramView(
      "zcode.context.compaction.duration",
      [0.01, 0.05, 0.1, 0.5, 1, 5, 30, 120, 300, 600],
    ),
    histogramView(
      "zcode.detached.operation.duration",
      [0.01, 0.05, 0.1, 0.5, 1, 5, 30, 120, 300, 600],
    ),
    histogramView("zcode.agent.step.duration", [0.01, 0.05, 0.1, 0.5, 1, 5, 30, 120, 300, 600]),
    histogramView("zcode.tool.execution.duration", [0.01, 0.1, 0.5, 1, 5, 30, 120, 300]),
    histogramView(
      "zcode.command.execution.duration",
      [0.01, 0.05, 0.1, 0.5, 1, 5, 30, 120, 300, 600],
    ),
    histogramView("zcode.*.time_to_first_*", [0.25, 0.5, 1, 2, 5, 10, 30, 60]),
    histogramView("zcode.model.call.attempts", [1, 2, 3, 5, 8]),
    cardinalityView("zcode.model.attempt.tokens"),
    cardinalityView("zcode.model.attempt.stream_stall.count"),
    cardinalityView("zcode.telemetry.creation_drop.count"),
    cardinalityView("zcode.telemetry.abandoned.count"),
  ];
}

function histogramView(instrumentName: string, boundaries: number[]): ViewOptions {
  return {
    aggregation: {
      options: { boundaries, recordMinMax: false },
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
    },
    aggregationCardinalityLimit: 250,
    instrumentName,
  };
}

function cardinalityView(instrumentName: string): ViewOptions {
  return {
    aggregationCardinalityLimit: 250,
    instrumentName,
  };
}

export function resourceAttributes(
  resource: TelemetryResourceContext,
): Record<string, string | number | boolean> {
  return telemetryResourceAttributes(resource, {
    includeInstallationId: true,
    includeServiceInstanceId: true,
  });
}

export function metricResourceAttributes(
  resource: TelemetryResourceContext,
): Record<string, string | number | boolean> {
  return telemetryResourceAttributes(resource, {
    includeInstallationId: false,
    includeServiceInstanceId: false,
  });
}

function telemetryResourceAttributes(
  resource: TelemetryResourceContext,
  options: {
    includeInstallationId: boolean;
    includeServiceInstanceId: boolean;
  },
): Record<string, string | number | boolean> {
  return compactResourceAttributes({
    "deployment.environment.name": resource.deploymentEnvironment,
    "host.arch": hostArchitecture(),
    "os.type": process.platform,
    "process.runtime.name": "nodejs",
    "process.runtime.version": process.version.replace(/^v/u, ""),
    // Metric Resource 也参与时序 Series 身份。CLI 每次启动生成的实例 ID 和安装 ID 只能
    // 属于 Trace；若进入 Metric，会在所有用户进程间制造无界基数。
    "service.instance.id": options.includeServiceInstanceId
      ? resource.serviceInstanceId
      : undefined,
    "service.name": resource.serviceName,
    "service.version": resource.cliVersion,
    "zcode.build.commit_id": resource.buildCommitId,
    "zcode.device.installation_id": options.includeInstallationId
      ? resource.installationId
      : undefined,
    "zcode.product.version": resource.productVersion,
    "zcode.runtime.distribution": resource.runtimeDistribution,
    "zcode.runtime.surface": resource.runtimeSurface,
    "zcode.telemetry.schema_owner": "cli",
    "zcode.telemetry.schema_version": TELEMETRY_SCHEMA_VERSION,
  });
}

function hostArchitecture(): string {
  switch (process.arch) {
    case "x64":
      return "amd64";
    case "ia32":
      return "x86";
    default:
      return process.arch;
  }
}

function compactResourceAttributes(
  attributes: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const compacted: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== "") compacted[key] = value;
  }
  return compacted;
}

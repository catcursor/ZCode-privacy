import type { AgentTelemetryRuntimeOwner, AgentExecutionTelemetryPort, ModelApiRuntimeSurface, ModelExecutionTelemetryPort, TelemetryIdentitySnapshot, TelemetryResourceContext } from "@zcode/contracts/telemetry";
import type { ModelStatusSink } from "@zcode/contracts/model";
import { NoopAgentExecutionTelemetry } from "./agent-trace-runtime.js";
type EnvRecord = Record<string, string | undefined>;
const noop = new NoopAgentExecutionTelemetry();
export interface CreateModelTelemetryOptions { owner?: AgentTelemetryRuntimeOwner; sessionId?: string; }
export interface ModelTelemetryBootstrap {
  agentExecution: AgentExecutionTelemetryPort;
  enabled: boolean;
  modelExecution: ModelExecutionTelemetryPort;
  statusSink?: ModelStatusSink;
  shutdown(): Promise<void>;
}
export interface PrepareModelTelemetryOptions {
  buildCommitId?: string;
  cliVersion?: string;
  onWarning?: (message: string, context: Record<string, unknown>) => void;
  productVersion?: string;
  runtimeDistribution?: TelemetryResourceContext["runtimeDistribution"];
  runtimeSurface?: ModelApiRuntimeSurface;
}
// 不能仅依赖环境变量开关：宿主直接注入 Owner 也必须走无上报路径。
export function createModelTelemetry(_options: CreateModelTelemetryOptions = {}): ModelTelemetryBootstrap {
  return { agentExecution: noop, modelExecution: noop, enabled: false, async shutdown() {} };
}
export function resolveOtlpTraceEndpoint(_env: EnvRecord): undefined { return undefined; }
export function resolveOtlpMetricEndpoint(_env: EnvRecord): undefined { return undefined; }
export function parseOtlpHeaders(_value: string | undefined): undefined { return undefined; }
export async function prepareModelTelemetryEnv(env: EnvRecord, _options: PrepareModelTelemetryOptions = {}): Promise<EnvRecord> {
  return { ...env, ZCODE_MODEL_TELEMETRY_ENABLED: "false", OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined, OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: undefined };
}
export async function shutdownPreparedModelTelemetry(): Promise<void> {}
export function updatePreparedTelemetryIdentity(_snapshot: TelemetryIdentitySnapshot): void {}
export function normalizeTelemetryDeviceMid(_value: string | undefined): undefined { return undefined; }

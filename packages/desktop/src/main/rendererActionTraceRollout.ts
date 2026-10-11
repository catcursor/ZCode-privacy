import {
  DISABLED_RENDERER_ACTION_TRACE_CONFIG,
  rendererActionTraceConfigSchema,
  rendererActionTraceGroupSchema,
  type RendererActionTraceConfigV1,
} from "@zcode/shared";
import {
  type SingleFeatureRollout,
  type SingleFeatureRolloutLogger,
} from "./singleFeatureRollout.js";

export type RendererActionTraceRollout = SingleFeatureRollout<RendererActionTraceConfigV1>;

export function resolveRendererActionTraceConfig(
  payload: unknown,
): RendererActionTraceConfigV1 | null {
  if (typeof payload !== "object" || payload === null) return null;
  const envelope = payload as {
    code?: unknown;
    success?: unknown;
    data?: {
      configs?: {
        rendererActionTrace?: {
          enabled?: unknown;
          localTtftEnabled?: unknown;
          sample_ratio?: unknown;
          sampleRatio?: unknown;
          enabled_groups?: unknown;
          enabledGroups?: unknown;
          config_version?: unknown;
          configVersion?: unknown;
        } | null;
      } | null;
    } | null;
  };
  if ((envelope.code !== undefined && envelope.code !== 0) || envelope.success === false) {
    return null;
  }
  const config = envelope.data?.configs?.rendererActionTrace;
  if (config === undefined || config === null) {
    return { ...DISABLED_RENDERER_ACTION_TRACE_CONFIG };
  }
  const enabledGroupsInput = config.enabled_groups ?? config.enabledGroups;
  const enabledGroups = Array.isArray(enabledGroupsInput)
    ? enabledGroupsInput.flatMap((value) => {
        const parsed = rendererActionTraceGroupSchema.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      })
    : enabledGroupsInput;
  const candidate = {
    enabled: config.enabled,
    ...(config.localTtftEnabled !== undefined ? { localTtftEnabled: config.localTtftEnabled } : {}),
    sampleRatio: config.sample_ratio ?? config.sampleRatio,
    enabledGroups,
    configVersion: config.config_version ?? config.configVersion,
  };
  const parsed = rendererActionTraceConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function createRendererActionTraceRollout(_options: {
  fetchConfig: (signal: AbortSignal) => Promise<unknown>;
  logger: SingleFeatureRolloutLogger;
  timeoutMs?: number;
  cacheTtlMs?: number;
}): RendererActionTraceRollout {
  return {
    getSnapshot: () => ({ ...DISABLED_RENDERER_ACTION_TRACE_CONFIG }),
    refresh: async () => ({ ...DISABLED_RENDERER_ACTION_TRACE_CONFIG }),
    awaitFirstDecision: async () => ({ ...DISABLED_RENDERER_ACTION_TRACE_CONFIG }),
  };
}

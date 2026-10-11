import { describe, expect, it, vi } from "vitest";
import {
  createRendererActionTraceRollout,
  resolveRendererActionTraceConfig,
} from "../src/main/rendererActionTraceRollout.js";

describe("renderer action trace rollout", () => {
  it("parses known groups and ignores unknown groups", () => {
    expect(
      resolveRendererActionTraceConfig({
        code: 0,
        data: {
          configs: {
            rendererActionTrace: {
              enabled: true,
              sample_ratio: 0.05,
              enabled_groups: ["core", "future", "settings"],
              config_version: "v1",
            },
          },
        },
      }),
    ).toEqual({
      enabled: true,
      sampleRatio: 0.05,
      enabledGroups: ["core", "settings"],
      configVersion: "v1",
    });
  });

  it("fails closed when the key is missing and rejects an unsafe ratio", () => {
    expect(resolveRendererActionTraceConfig({ code: 0, data: { configs: {} } })).toEqual({
      enabled: false,
      sampleRatio: 0,
      enabledGroups: [],
      configVersion: "disabled",
    });
    expect(
      resolveRendererActionTraceConfig({
        code: 0,
        data: {
          configs: {
            rendererActionTrace: {
              enabled: true,
              sample_ratio: 0.5,
              enabled_groups: ["core"],
              config_version: "bad",
            },
          },
        },
      }),
    ).toBeNull();
  });

  it("keeps tracing disabled without fetching rollout configuration", async () => {
    const fetchConfig = vi.fn();
    const rollout = createRendererActionTraceRollout({ fetchConfig, logger: { warn: vi.fn() } });
    expect((await rollout.refresh()).enabled).toBe(false);
    expect((await rollout.awaitFirstDecision(1)).enabled).toBe(false);
    expect(fetchConfig).not.toHaveBeenCalled();
  });
});

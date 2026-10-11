import { describe, expect, it, vi } from "vitest";
import { createModelTelemetry, prepareModelTelemetryEnv, resolveOtlpMetricEndpoint, resolveOtlpTraceEndpoint, normalizeTelemetryDeviceMid } from "../src/bootstrap.js";
import { createOwnedAgentTelemetryRuntime } from "../src/otlp-exporter.js";
import type { AgentTelemetryRuntimeOwner } from "@zcode/contracts/telemetry";

describe("privacy edition CLI reporting", () => {
  it("ignores explicit enable flags and endpoints without creating an identity", async () => {
    const env = { ZCODE_MODEL_TELEMETRY_ENABLED: "true", OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example" };
    expect(resolveOtlpTraceEndpoint(env)).toBeUndefined();
    expect(resolveOtlpMetricEndpoint(env)).toBeUndefined();
    expect(normalizeTelemetryDeviceMid("synthetic-device")).toBeUndefined();
    const prepared = await prepareModelTelemetryEnv(env);
    expect(prepared.ZCODE_MODEL_TELEMETRY_ENABLED).toBe("false");
    expect(prepared.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(env.ZCODE_MODEL_TELEMETRY_ENABLED).toBe("true");
  });

  it("does not access a host-injected owner", async () => {
    const read = vi.fn(() => { throw new Error("must not inspect an owner"); });
    const owner = new Proxy({} as AgentTelemetryRuntimeOwner, { get: read });
    const result = createModelTelemetry({ owner, sessionId: "synthetic-session" });
    expect(result.enabled).toBe(false);
    expect(result.statusSink).toBeUndefined();
    await result.shutdown();
    expect(read).not.toHaveBeenCalled();
  });

  it("direct exporter creation also returns disabled ports without reading configuration", async () => {
    const read = vi.fn(() => { throw new Error("must not inspect exporter configuration"); });
    const options = new Proxy({} as Parameters<typeof createOwnedAgentTelemetryRuntime>[0], { get: read });
    const owner = createOwnedAgentTelemetryRuntime(options);
    expect(owner.enabled).toBe(false);
    expect(owner.statusSink).toBeUndefined();
    owner.abandonSession("synthetic-session");
    await owner.flush();
    await owner.shutdown();
    expect(read).not.toHaveBeenCalled();
  });
});

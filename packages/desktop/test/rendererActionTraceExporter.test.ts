import { expect, it } from "vitest";
import {
  resolveRendererActionTraceEndpoint,
  parseRendererActionTraceHeaders,
  createRendererActionTraceExporter,
  validHttpUrl,
} from "../src/main/rendererActionTraceExporter.js";
it("ignores all OTLP endpoint and header settings", () => {
  const env = {
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://collector.example/traces",
  };
  expect(resolveRendererActionTraceEndpoint(env)).toBeUndefined();
  expect(createRendererActionTraceExporter(env)).toBeUndefined();
  expect(parseRendererActionTraceHeaders("authorization=synthetic-secret")).toBeUndefined();
});
it("keeps pure HTTP URL validation for local compatibility", () => {
  expect(validHttpUrl("https://example.com")).toBe("https://example.com/");
  expect(validHttpUrl("file:///private")).toBeUndefined();
  expect(validHttpUrl("https://user:secret@example.com")).toBeUndefined();
});

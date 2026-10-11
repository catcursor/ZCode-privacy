import { expect, it, vi } from "vitest";
import { createRendererActionTraceBroker } from "../src/main/rendererActionTraceBroker.js";
it("rejects batches without reading them or calling an injected exporter", async () => {
  const exporter = { export: vi.fn(), shutdown: vi.fn(async () => {}) };
  const broker = createRendererActionTraceBroker({
    exporter,
    logger: { debug: vi.fn(), warn: vi.fn() },
  });
  expect(
    broker.enqueue({
      toJSON: () => {
        throw new Error("private payload");
      },
    }),
  ).toBe(false);
  await broker.flush();
  await broker.shutdown();
  expect(exporter.export).not.toHaveBeenCalled();
  expect(exporter.shutdown).not.toHaveBeenCalled();
});

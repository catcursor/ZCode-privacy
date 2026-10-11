import type { SpanExporter } from "@opentelemetry/sdk-trace-base";

export interface RendererActionTraceBroker {
  enqueue(batch: unknown): boolean;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

export function createRendererActionTraceBroker(_options: {
  exporter: SpanExporter | undefined;
  logger: {
    debug(...args: unknown[]): void;
    warn(...args: unknown[]): void;
  };
  shutdownTimeoutMs?: number;
  flushTimeoutMs?: number;
  exportTimeoutMs?: number;
}): RendererActionTraceBroker {
  return { enqueue: () => false, async flush() {}, async shutdown() {} };
}

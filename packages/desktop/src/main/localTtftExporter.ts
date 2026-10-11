// 兼容 IPC 生命周期，不创建 OTLP exporter、MeterProvider 或批次队列。
export function createLocalTtftExporter(_options: {
  env: Record<string, string | undefined>;
  now?: () => number;
  version: string;
  logger: { warn(...args: unknown[]): void };
}) {
  return {
    enqueue(_input: unknown): void {},
    async shutdown(): Promise<void> {},
  };
}

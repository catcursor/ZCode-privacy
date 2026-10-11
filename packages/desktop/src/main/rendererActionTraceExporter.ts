import type { SpanExporter } from "@opentelemetry/sdk-trace-base";

type EnvRecord = Record<string, string | undefined>;

export function resolveRendererActionTraceEndpoint(_env: EnvRecord): string | undefined {
  return undefined;
}

export function parseRendererActionTraceHeaders(
  _value: string | undefined,
): Record<string, string> | undefined {
  return undefined;
}

export function createRendererActionTraceExporter(_env: EnvRecord): SpanExporter | undefined {
  return undefined;
}

export function validHttpUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password
    ) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

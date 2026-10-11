import type { NodeZCodeBuiltinProviderConfigSource } from "./zcode-builtin-provider-config-source.js";
import type { ZCodeBuiltinRelease } from "./zcode-builtin-release.js";

export type ZCodeBuiltinRefreshResult =
  | "updated"
  | "unchanged"
  | "stale"
  | "missing"
  | "skipped"
  | "disposed";

export interface ZCodeBuiltinRemoteSynchronizerOptions {
  readonly source: NodeZCodeBuiltinProviderConfigSource;
  readonly controlFilePath: string;
  readonly resolveEndpointKey: () => string | Promise<string>;
  readonly fetchRelease: (
    endpointKey: string,
    signal: AbortSignal,
  ) => Promise<ZCodeBuiltinRelease | null>;
  readonly onRefreshResult?: (event: ZCodeBuiltinRefreshEvent) => void;
  readonly now?: () => number;
  readonly successIntervalMs?: number;
  readonly leaseDurationMs?: number;
  readonly failureBaseDelayMs?: number;
  readonly failureMaxDelayMs?: number;
}

export interface ZCodeBuiltinRefreshEvent {
  readonly result: ZCodeBuiltinRefreshResult;
  readonly reason?: "lease-held" | "not-due" | "endpoint-changed";
  readonly revision?: number;
}

// 保留运行时契约；隐私版没有远端刷新、文件租约或重试路径。
export class ZCodeBuiltinRemoteSynchronizer {
  #disposed = false;
  constructor(_options: ZCodeBuiltinRemoteSynchronizerOptions) {}
  refresh(_options: { readonly force?: boolean } = {}): Promise<ZCodeBuiltinRefreshResult> {
    return Promise.resolve(this.#disposed ? "disposed" : "skipped");
  }
  dispose(): void {
    this.#disposed = true;
  }
}

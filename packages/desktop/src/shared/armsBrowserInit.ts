import type { ZCodeRuntimeEnv } from "@zcode/shared";
// 保留入口契约，禁止注入 Browser SDK、采集页面或开启重试定时器。
export function initArmsBrowserRumOnce(_runtimeEnv: ZCodeRuntimeEnv): boolean {
  return true;
}
export function scheduleArmsBrowserRumInit(_runtimeEnv: ZCodeRuntimeEnv, _maxAttempts = 50): void {}

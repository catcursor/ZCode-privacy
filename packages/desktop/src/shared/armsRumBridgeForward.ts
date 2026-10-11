import type { IpcRenderer } from "electron";

/** 与 @arms/rum-electron 内置 preload 一致 */
export const ARMS_RUM_BRIDGE_CHANNEL = "arms:rum-bridge";

/**
 * SDK browser-reporter 发送 JSON.stringify(events[])，主进程 IPC 拒绝 Array。
 * 在 preload 顶层拦截 ipcRenderer.send，不依赖 ArmsEventBridge 创建时机（autoInject 可能晚于 scheduleArmsBridgePatch）。
 */
export function expandArmsRumBridgePayloads(payload: string): string[] {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      const expanded: string[] = [];
      for (const item of parsed) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          expanded.push(JSON.stringify(item));
        }
      }
      return expanded;
    }
  } catch {
    // 非 JSON 走原样
  }
  return [payload];
}

type ArmsEventBridgeLike = {
  send: (payload: string) => void;
  __zcodeArmsBridgeForwardPatched?: boolean;
};

/**
 * ARMS frame preload 先于本 preload 执行时，Bridge.send 闭包已绑定未 patch 的 ipc.send；
 * 必须包装 Bridge.send 本身，在调用内层 send 前把 events[] 拆条。
 */
export function patchArmsEventBridgeSend(bridge: ArmsEventBridgeLike): void {
  bridge.send = () => {};
  bridge.__zcodeArmsBridgeForwardPatched = true;
}

export function patchArmsEventBridgeIfPresent(): boolean {
  const bridge =
    (globalThis as { ArmsEventBridge?: ArmsEventBridgeLike }).ArmsEventBridge ??
    (typeof window !== "undefined"
      ? (window as { ArmsEventBridge?: ArmsEventBridgeLike }).ArmsEventBridge
      : undefined);
  if (!bridge || typeof bridge.send !== "function") {
    return false;
  }
  patchArmsEventBridgeSend(bridge);
  return true;
}

export function scheduleArmsEventBridgePatch(_maxAttempts = 100): void {
  // 不启动 SDK Bridge 重试定时器。
}

export function installArmsRumBridgeIpcForward(_ipc: IpcRenderer): void {
  // 未安装 ARMS SDK，无需修改正常 IPC。
}

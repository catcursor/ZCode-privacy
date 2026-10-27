import type { WebRequest } from "electron";
import { rewriteZhipuUrl } from "@zcode/shared/privacy/network";

const installed = new WeakSet<object>();
const NETWORK_URLS = ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"];
type Listener = NonNullable<Parameters<WebRequest["onBeforeRequest"]>[1]>;
type Filter = { urls: string[] };

function matches(pattern: string, url: string): boolean {
  if (pattern === "<all_urls>") return true;
  const expression = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join(".*");
  return new RegExp(`^${expression}$`, "u").test(url);
}

/** Electron 同一事件只保留最后一个 listener；策略包住注册入口，后续 sandbox/观测者不能覆盖它。 */
export function installChromiumZhipuLoopbackPolicy(
  source: Pick<WebRequest, "onBeforeRequest">,
): void {
  if (installed.has(source)) return;
  installed.add(source);
  const register = source.onBeforeRequest.bind(source);
  source.onBeforeRequest = ((
    filterOrListener: Filter | Listener | null,
    next?: Listener | null,
  ) => {
    const filter = typeof filterOrListener === "object" ? filterOrListener : undefined;
    const listener = typeof filterOrListener === "function" ? filterOrListener : next;
    register(
      { urls: [...new Set([...NETWORK_URLS, ...(filter?.urls ?? [])])] },
      (details, callback) => {
        const redirectURL = rewriteZhipuUrl(details.url);
        if (redirectURL !== details.url) {
          callback({ redirectURL });
        } else if (
          listener &&
          (!filter || filter.urls.some((pattern) => matches(pattern, details.url)))
        ) {
          listener(details, callback);
        } else {
          callback({});
        }
      },
    );
  }) as WebRequest["onBeforeRequest"];
  source.onBeforeRequest(null);
}

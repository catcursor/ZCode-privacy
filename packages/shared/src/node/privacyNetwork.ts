import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { urlToHttpOptions } from "node:url";
import { promisify } from "node:util";
import { isZhipuHostname, rewriteZhipuUrl, ZHIPU_LOOPBACK_HOST } from "../privacyNetwork.js";
import { createZhipuLoopbackFetch } from "../privacyFetch.js";

const INSTALLATION = Symbol.for("zcode.privacy.zhipu-loopback.installed");
type RequestFunction = (...args: unknown[]) => http.ClientRequest;
type LookupFunction = (hostname: string, ...args: unknown[]) => unknown;

function withoutHostHeader(headers: http.OutgoingHttpHeaders | readonly string[] | undefined) {
  if (Array.isArray(headers)) {
    return headers.flatMap((value, index) => {
      const name = index % 2 === 0 ? value : headers[index - 1];
      return name?.toLowerCase() === "host" ? [] : [value];
    });
  }
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter(([name]) => name.toLowerCase() !== "host"),
  );
}

function rewriteRequestArgs(args: unknown[]): unknown[] {
  const first = args[0];
  let url: URL | undefined;
  if (typeof first === "string" || first instanceof URL) {
    try {
      url = new URL(first);
    } catch {
      return args;
    }
  }
  const options = (url ? (typeof args[1] === "object" ? args[1] : {}) : first) as
    | https.RequestOptions
    | undefined;
  if (!options || typeof options !== "object") return args;
  const hostname = options.hostname ?? options.host ?? url?.hostname ?? "";
  const absolutePath = typeof options.path === "string" ? rewriteZhipuUrl(options.path) : undefined;
  const pathMapped = typeof options.path === "string" && absolutePath !== options.path;
  const connectTarget =
    options.method?.toUpperCase() === "CONNECT" && typeof options.path === "string"
      ? `https://${options.path}`
      : undefined;
  const mappedConnect = connectTarget ? rewriteZhipuUrl(connectTarget) : undefined;
  const connectMapped = connectTarget !== undefined && mappedConnect !== connectTarget;
  if (!isZhipuHostname(hostname) && !pathMapped && !connectMapped) return args;
  // URL/options 的优先级遵循 Node；仅目的主机被替换，不能让旧 Host、代理 Agent 或连接工厂绕回原站。
  const mapped: https.RequestOptions = {
    ...(url ? urlToHttpOptions(url) : {}),
    ...options,
    hostname: ZHIPU_LOOPBACK_HOST,
    host: ZHIPU_LOOPBACK_HOST,
    servername: "",
    agent: false,
    lookup: undefined,
    createConnection: undefined,
    headers: withoutHostHeader(options.headers),
    ...(absolutePath && absolutePath !== options.path ? { path: absolutePath } : {}),
    ...(connectMapped
      ? { path: `${new URL(mappedConnect!).hostname}:${new URL(mappedConnect!).port || "443"}` }
      : {}),
  };
  const callback = args.find((arg) => typeof arg === "function");
  return callback ? [mapped, callback] : [mapped];
}

/** 进程启动时安装一次；HTTP(S)/WebSocket、原生 fetch 及裸 DNS 共用同一主机判定。 */
export function installZhipuLoopbackNetworkPolicy(): void {
  if (Reflect.get(globalThis, INSTALLATION)) return;
  Reflect.set(globalThis, INSTALLATION, true);
  for (const module of [http, https]) {
    for (const name of ["request", "get"] as const) {
      const original = module[name].bind(module) as RequestFunction;
      module[name] = ((...args: unknown[]) =>
        original(...rewriteRequestArgs(args))) as (typeof module)[typeof name];
    }
  }
  const lookup = dns.lookup.bind(dns) as LookupFunction;
  dns.lookup = ((host: string, ...args: unknown[]) =>
    lookup(isZhipuHostname(host) ? ZHIPU_LOOPBACK_HOST : host, ...args)) as typeof dns.lookup;
  const lookupAsync = dnsPromises.lookup.bind(dnsPromises) as LookupFunction;
  dnsPromises.lookup = ((host: string, ...args: unknown[]) =>
    lookupAsync(
      isZhipuHostname(host) ? ZHIPU_LOOPBACK_HOST : host,
      ...args,
    )) as typeof dnsPromises.lookup;
  // dns.lookup 的 promisify 返回 {address, family}，不能因包装函数而退化成仅 address 字符串。
  Object.defineProperty(dns.lookup, promisify.custom, {
    value: dnsPromises.lookup,
    configurable: true,
  });
  globalThis.fetch = createZhipuLoopbackFetch(globalThis.fetch.bind(globalThis));
  const NativeWebSocket = globalThis.WebSocket;
  if (NativeWebSocket) {
    globalThis.WebSocket = class extends NativeWebSocket {
      constructor(...[url, protocols]: ConstructorParameters<typeof NativeWebSocket>) {
        const mapped = rewriteZhipuUrl(String(url));
        const options =
          protocols &&
          typeof protocols === "object" &&
          !Array.isArray(protocols) &&
          ["127.0.0.1", "localhost", "[::1]"].includes(new URL(mapped).hostname)
            ? { ...(protocols as object), dispatcher: undefined }
            : protocols;
        // Node 24/25 的 WebSocketInit 类型声明不同，运行时对象分支已由上面的检查收敛。
        super(mapped, options as typeof protocols);
      }
    };
  }
  syncBuiltinESMExports();
}

import { rewriteZhipuUrl } from "./privacyNetwork.js";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;
const BODY_HEADERS = [
  "content-encoding",
  "content-language",
  "content-location",
  "content-type",
  "content-length",
];
const CREDENTIAL_HEADERS = [
  "authorization",
  "proxy-authorization",
  "cookie",
  "cookie2",
  "x-api-key",
  "api-key",
];
type TransportInit = RequestInit & { duplex?: "half"; dispatcher?: unknown; agent?: unknown };

/**
 * 原生 fetch 在内部跟随重定向会绕过初始 URL 检查；逐跳重新映射，且不把回环请求交给代理。
 * 保留 Request 的 body、取消和重定向语义，不读取或记录请求内容。
 */
export function createZhipuLoopbackFetch(source: typeof fetch): typeof fetch {
  return async (input, init) => {
    let request = new Request(input, init);
    const mode = request.redirect;
    let transport = { ...init } as TransportInit;
    // JSON/字节正文仍以原类型交给 fetch，保留 Content-Length，避免普通模型请求变成 chunked。
    let reusableBody = init?.body;
    let reuseBody =
      reusableBody !== undefined &&
      reusableBody !== null &&
      !(reusableBody instanceof ReadableStream) &&
      !(reusableBody instanceof FormData);
    let redirected = false;
    for (let redirects = 0; ; redirects++) {
      request.signal.throwIfAborted();
      const mappedUrl = rewriteZhipuUrl(request.url);
      if (mappedUrl !== request.url) {
        const headers = new Headers(request.headers);
        headers.delete("host");
        request = new Request(mappedUrl, new Request(request, { headers }));
      }
      if (["127.0.0.1", "localhost", "[::1]"].includes(new URL(mappedUrl).hostname)) {
        transport = { ...transport, dispatcher: undefined, agent: undefined };
      }
      // 只有带正文的请求需要可重放副本；GET/HEAD 不创建 tee 缓冲。
      const replay = mode === "follow" && request.body && !reuseBody ? request.clone() : request;
      const response = await source(request.url, {
        ...transport,
        method: request.method,
        headers: request.headers,
        body: reuseBody ? reusableBody : request.body,
        signal: request.signal,
        cache: request.cache,
        credentials: request.credentials,
        integrity: request.integrity,
        mode: request.mode,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        ...(request.body ? { duplex: "half" as const } : {}),
        redirect: "manual",
      } as TransportInit);
      const location = response.headers.get("location");
      if (!REDIRECT_STATUSES.has(response.status) || location === null || mode === "manual") {
        if (replay !== request) void replay.body?.cancel().catch(() => {});
        if (reuseBody) void request.body?.cancel().catch(() => {});
        if (redirected) Object.defineProperty(response, "redirected", { value: true });
        return response;
      }
      if (mode === "error" || redirects >= MAX_REDIRECTS) {
        if (replay !== request) void replay.body?.cancel().catch(() => {});
        void response.body?.cancel().catch(() => {});
        throw new TypeError("HTTP redirect is not allowed or exceeded the redirect limit");
      }
      const nextUrl = new URL(location, request.url);
      if (!["http:", "https:"].includes(nextUrl.protocol) || nextUrl.username || nextUrl.password) {
        void response.body?.cancel().catch(() => {});
        throw new TypeError("HTTP redirect target is invalid");
      }
      const headers = new Headers(replay.headers);
      const mappedNextUrl = new URL(rewriteZhipuUrl(nextUrl.href));
      if (mappedNextUrl.origin !== new URL(request.url).origin) {
        for (const name of CREDENTIAL_HEADERS) headers.delete(name);
      }
      headers.delete("host");
      const discardBody =
        ((response.status === 301 || response.status === 302) && replay.method === "POST") ||
        (response.status === 303 && !["GET", "HEAD"].includes(replay.method));
      if (discardBody) {
        for (const name of BODY_HEADERS) headers.delete(name);
        if (replay !== request) void replay.body?.cancel().catch(() => {});
      }
      void response.body?.cancel().catch(() => {});
      if (reuseBody) void replay.body?.cancel().catch(() => {});
      request = new Request(nextUrl, {
        method: discardBody ? "GET" : replay.method,
        headers,
        body: discardBody ? undefined : reuseBody ? reusableBody : replay.body,
        signal: replay.signal,
        ...(replay.body && !discardBody ? { duplex: "half" as const } : {}),
      } as TransportInit);
      if (discardBody) {
        reusableBody = undefined;
        reuseBody = false;
      }
      redirected = true;
    }
  };
}

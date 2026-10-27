/** 智谱域名仅用于匹配旧配置；出站地址和随包默认 URL 均使用回环地址。 */
export const ZHIPU_LOOPBACK_HOST = "127.0.0.1";
const ZHIPU_DOMAIN_ROOTS = [
  "z.ai",
  "bigmodel.cn",
  "codegeex.cn",
  "chatglm.cn",
  "zcode.ai",
  "zhipuai.cn",
  "zhipuai.com",
  "zhipu.cn",
  "zhipu.ai",
  "zhipu-ai.feishu.cn",
];

/** @param {string} hostname */
export function isZhipuHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.+$/u, "");
  return ZHIPU_DOMAIN_ROOTS.some((root) => host === root || host.endsWith(`.${root}`));
}

/** Chromium 的 DNS 预取不经过 webRequest；同时映射根域和未来子域，其他主机继续正常解析。 */
export function buildZhipuHostResolverRules() {
  return ZHIPU_DOMAIN_ROOTS.flatMap((root) => [
    `MAP ${root} ${ZHIPU_LOOPBACK_HOST}`,
    `MAP *.${root} ${ZHIPU_LOOPBACK_HOST}`,
  ]).join(", ");
}

/** @param {string} input */
export function rewriteZhipuUrl(input) {
  const protocolRelative = input.startsWith("//");
  try {
    const url = new URL(protocolRelative ? `https:${input}` : input);
    if (!isZhipuHostname(url.hostname)) return input;
    url.hostname = ZHIPU_LOOPBACK_HOST;
    return protocolRelative ? url.href.slice("https:".length) : url.href;
  } catch {
    return input;
  }
}

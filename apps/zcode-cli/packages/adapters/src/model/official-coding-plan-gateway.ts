import type { ProviderEndpointRoutingPort } from "@zcode/contracts";
import { rewriteZhipuUrl } from "@zcode/shared/privacy/network";

/** 智谱只映射到本机，绝不再经过产品网关；127.0.0.1 上的第三方模型不参与改道。 */
export function createStaticProviderEndpointRoutingPort(
  _endpointOrigin: string,
): ProviderEndpointRoutingPort {
  return {
    async resolve(requestUrl) {
      const url = rewriteZhipuUrl(requestUrl);
      return { routed: url !== requestUrl, url };
    },
  };
}

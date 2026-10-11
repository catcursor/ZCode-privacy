/** 遥测 SDK 的本地兼容层：不采集、缓存、注入脚本或创建传输。 */
const privacyTelemetry = {
  init: async (_options?: unknown): Promise<void> => {},
  sendCustom: (_payload: unknown): void => {},
  sendEvent: (_payload: unknown): void => {},
  setConfig: (_key: string, _value: unknown): void => {},
  getConfig: (): { env: string } => ({ env: "local" }),
};
export default privacyTelemetry;

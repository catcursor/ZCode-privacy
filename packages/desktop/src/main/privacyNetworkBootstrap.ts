import "@zcode/shared/privacy/network-node";
import { app, session, shell } from "electron";
import { buildZhipuHostResolverRules, rewriteZhipuUrl } from "@zcode/shared/privacy/network";
import { installChromiumZhipuLoopbackPolicy } from "./privacyNetwork.js";

// DNS 预取/预连接没有普通请求事件；启动前锁定这些域的解析，也覆盖根域与未来子域。
app.commandLine.appendSwitch("host-resolver-rules", buildZhipuHostResolverRules());
// 在创建任何 partition 之前登记；覆盖 renderer、内置浏览器、套餐、奖励及插件沙箱。
app.on("session-created", (created) => installChromiumZhipuLoopbackPolicy(created.webRequest));
void app
  .whenReady()
  .then(() => installChromiumZhipuLoopbackPolicy(session.defaultSession.webRequest));
const openExternal = shell.openExternal.bind(shell);
shell.openExternal = (url, options) => openExternal(rewriteZhipuUrl(url), options);

# 隐私版安装包

桌面版本为 3.15.1。按照[原版 CI 平台契约](https://github.com/zai-org/ZCode/blob/main/docs/ci-build-platform-selection.md)，已在 GitHub Actions 上构建 Windows、macOS、Linux 的 x64 和 ARM64，共六个目标。

| 系统    | x64 下载                                                                                                 | ARM64 下载                                                                                                 | 包内格式                                |
| ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Windows | [Windows x64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120923018/artifacts/11695601561) | [Windows ARM64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120923018/artifacts/11695247621) | EXE 安装包                              |
| macOS   | [macOS x64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904/artifacts/11695931567)   | [macOS ARM64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904/artifacts/11695715891)   | DMG、ZIP                                |
| Linux   | [Linux x64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904/artifacts/11695176646)   | [Linux ARM64](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904/artifacts/11694948119)   | AppImage、DEB、RPM、Arch `.pkg.tar.zst` |

Actions 下载需要登录 GitHub，产物保留 30 天。下载得到的外层 ZIP 包含相应安装包、`SHA256SUMS.txt`、`BUILD.json` 和隐私范围说明。macOS/Windows 产物未签名、macOS 未公证；macOS 的安装方法见上游 README 的桌面打包部分。

每个目标均通过上游打包流程的运行时依赖检查和包大小审计。Windows x64 安装包另已下载、核对 SHA-256 并解包，用随包的 Electron Node 运行时启动内置 Agent，`--version` 正常返回 `0.16.9`。未在六个平台运行完整桌面界面端到端测试；已有单元测试限制见 [PRIVACY.md](../PRIVACY.md)。

macOS/Linux 产物来自 `dfa23a30b81c4578552be02c5e9d14f7c3e6a044`；Windows 重跑产物来自 `d8c1ce122a330e165adf0f5c04a35002afe203fb`。两者应用与 Agent 源码相同，后者仅修复 Windows 检出资源的换行转换并新增工作流的平台重跑选择器。以各包的 `BUILD.json` 为准。

macOS/Linux 构建：[运行记录](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904)。该轮整体标记失败，因为 Windows 的首次构建被资源摘要校验拦下；macOS/Linux 四个目标均成功。Windows 修复后重跑：[运行记录](https://github.com/catcursor/ZCode-privacy/actions/runs/38120923018)。未跳过资源摘要校验。

需要重新构建时，打开仓库 Actions 的 **Build privacy desktop packages**，点击 **Run workflow**，选择 `privacy-hardening` 分支。平台默认 `all`，也可单独选择 `windows`、`macos` 或 `linux`；不需要配置厂商账号、上报地址或签名凭据。

# 隐私版安装包

桌面版本为 3.15.1。按照[原版 CI 平台契约](https://github.com/zai-org/ZCode/blob/main/docs/ci-build-platform-selection.md)，已在 GitHub Actions 上构建 Windows、macOS、Linux 的 x64 和 ARM64，共六个目标。

正式下载页：[ZCode Privacy 3.15.1 Releases](https://github.com/catcursor/ZCode-privacy/releases/tag/v3.15.1-privacy.1)。展开页面下方的 **Assets**，可直接下载全部 14 个安装包或压缩包。

| 系统    | x64 推荐下载                                                                                                                      | ARM64 推荐下载                                                                                                                     | 其他格式                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Windows | [EXE x64](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-win-x64.exe)                | [EXE ARM64](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-win-arm64.exe)             | —                             |
| macOS   | [DMG Intel](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-mac-x64.dmg)              | [DMG Apple Silicon](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-mac-arm64.dmg)     | ZIP                           |
| Linux   | [AppImage x64](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-linux-x86_64.AppImage) | [AppImage ARM64](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/ZCode-3.15.1-linux-arm64.AppImage) | DEB、RPM、Arch `.pkg.tar.zst` |

Releases 下载无需登录，也不受 Actions 产物 30 天保留期限影响。[SHA256SUMS.txt](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/SHA256SUMS.txt) 记录所有安装包的校验值；[BUILD-MANIFEST.json](https://github.com/catcursor/ZCode-privacy/releases/download/v3.15.1-privacy.1/BUILD-MANIFEST.json) 保留六个平台的真实源码提交和构建记录。所有安装包均已取回并与构建时的 SHA-256 对照核验。macOS/Windows 产物未签名、macOS 未公证；macOS 的安装方法见上游 README 的桌面打包部分。

每个目标均通过上游打包流程的运行时依赖检查和包大小审计。Windows x64 安装包另已下载、核对 SHA-256 并解包，用随包的 Electron Node 运行时启动内置 Agent，`--version` 正常返回 `0.16.9`。未在六个平台运行完整桌面界面端到端测试；已有单元测试限制见 [PRIVACY.md](../PRIVACY.md)。

macOS/Linux 产物来自 `dfa23a30b81c4578552be02c5e9d14f7c3e6a044`；Windows 重跑产物来自 `d8c1ce122a330e165adf0f5c04a35002afe203fb`。两者应用与 Agent 源码相同，后者仅修复 Windows 检出资源的换行转换并新增工作流的平台重跑选择器。以 Release 的 `BUILD-MANIFEST.json` 为准，Release 标签还包含后续的发布工作流与说明更新。

macOS/Linux 构建：[运行记录](https://github.com/catcursor/ZCode-privacy/actions/runs/38120588904)。该轮整体标记失败，因为 Windows 的首次构建被资源摘要校验拦下；macOS/Linux 四个目标均成功。Windows 修复后重跑：[运行记录](https://github.com/catcursor/ZCode-privacy/actions/runs/38120923018)。未跳过资源摘要校验。

需要重新构建并正式发布时，打开仓库 Actions 的 **Build privacy desktop packages**，点击 **Run workflow**，选择 `privacy-hardening` 分支，平台选 `all`，填写未使用过的版本标签，例如 `v3.15.1-privacy.2`。六个平台成功并核对摘要后，工作流将全部安装包发布到 Releases。留空版本标签则仅保留临时 Actions 产物，允许单独选择 `windows`、`macos` 或 `linux` 重跑。不需要配置厂商账号、上报地址或签名凭据；发布 Release 不会启用软件内的自动更新。

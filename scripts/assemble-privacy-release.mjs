import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const formats = {
  macos: [".dmg", ".zip"],
  windows: [".exe"],
  linux: [".AppImage", ".deb", ".rpm", ".pkg.tar.zst"],
};

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function assemblePrivacyRelease(input, output, expectedCommit) {
  const assets = [];
  const builds = [];
  const names = new Set();
  // 修复原因：Actions 产物会过期；发布前必须核对六个平台和原始摘要，避免交付残缺或被替换的文件。
  for (const [platform, extensions] of Object.entries(formats)) {
    for (const architecture of ["x64", "arm64"]) {
      const target = `${platform}-${architecture}`;
      const directory = path.join(input, `ZCode-privacy-${target}`);
      const build = JSON.parse(await readFile(path.join(directory, "BUILD.json"), "utf8"));
      if (
        build.platform !== platform ||
        build.architecture !== architecture ||
        !/^[a-f0-9]{40}$/.test(build.commit) ||
        (expectedCommit && build.commit !== expectedCommit) ||
        build.unsigned !== true ||
        build.reporting !== false ||
        build.autoUpdate !== false
      )
        throw new Error(`Invalid build metadata: ${target}`);
      const manifest = await readFile(path.join(directory, "SHA256SUMS.txt"), "utf8");
      const files = manifest
        .trim()
        .split(/\r?\n/)
        .map((line) => {
          const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
          if (!match || match[2] !== path.basename(match[2]) || /[\\/]/.test(match[2])) {
            throw new Error(`Invalid checksum entry: ${target}`);
          }
          return { sha256: match[1], name: match[2] };
        });
      if (
        files.length !== extensions.length ||
        extensions.some(
          (extension) => files.filter((file) => file.name.endsWith(extension)).length !== 1,
        )
      )
        throw new Error(`Incomplete installers: ${target}`);
      for (const file of files) {
        if (names.has(file.name)) throw new Error(`Duplicate release asset: ${file.name}`);
        names.add(file.name);
        const source = path.join(directory, file.name);
        if ((await sha256(source)) !== file.sha256)
          throw new Error(`Checksum mismatch: ${file.name}`);
        assets.push({ ...file, target, source });
      }
      builds.push({ target, ...build });
    }
  }
  // 全部验证成功后再写入；拒绝旧产物混入同一发布目录。
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length) throw new Error("Release output must be empty");
  assets.sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const file of assets) await copyFile(file.source, path.join(output, file.name));
  await writeFile(
    path.join(output, "SHA256SUMS.txt"),
    assets.map((file) => `${file.sha256}  ${file.name}\n`).join(""),
  );
  await writeFile(
    path.join(output, "BUILD-MANIFEST.json"),
    `${JSON.stringify(
      {
        builds,
        assets: assets.map(({ source: _source, ...asset }) => asset),
      },
      null,
      2,
    )}\n`,
  );
  await copyFile(new URL("../PRIVACY.md", import.meta.url), path.join(output, "PRIVACY.md"));
  await writeFile(
    path.join(output, "RELEASE-NOTES.md"),
    `六个平台的安装包已由 GitHub Actions 构建，可在下方 Assets 直接下载，无需登录。\n\n| 系统 | 架构 | 格式 |\n| --- | --- | --- |\n| Windows | x64、ARM64 | EXE |\n| macOS | Intel x64、Apple Silicon ARM64 | DMG、ZIP |\n| Linux | x64、ARM64 | AppImage、DEB、RPM、Arch pkg.tar.zst |\n\n保留自定义模型、API 配置和终端能力；关闭正常使用之外的上传、自动更新、遥测和数据上报。正常模型请求仍发送到用户配置的服务。\n\n下载后可用 SHA256SUMS.txt 校验，BUILD-MANIFEST.json 记录每个平台的真实源码提交和构建记录。Windows/macOS 安装包未签名，macOS 未公证。六个平台的完整桌面界面端到端测试尚未完成。\n`,
  );
  return { builds, assets: assets.map(({ source: _source, ...asset }) => asset) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , input, output, expectedCommit] = process.argv;
  if (!input || !output)
    throw new Error("Usage: assemble-privacy-release.mjs INPUT OUTPUT [COMMIT]");
  const result = await assemblePrivacyRelease(input, output, expectedCommit);
  console.log(`Verified ${result.builds.length} targets and ${result.assets.length} installers`);
}

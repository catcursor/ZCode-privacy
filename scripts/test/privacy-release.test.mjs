import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assemblePrivacyRelease } from "../assemble-privacy-release.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "privacy-release-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "input");
  const output = path.join(root, "output");
  const commit = "a".repeat(40);
  for (const [platform, extensions] of Object.entries({
    macos: ["dmg", "zip"],
    windows: ["exe"],
    linux: ["AppImage", "deb", "rpm", "pkg.tar.zst"],
  })) {
    for (const architecture of ["x64", "arm64"]) {
      const target = `${platform}-${architecture}`;
      const directory = path.join(input, `ZCode-privacy-${target}`);
      await mkdir(directory, { recursive: true });
      const sums = [];
      for (const extension of extensions) {
        const name = `${target}.${extension}`;
        await writeFile(path.join(directory, name), target);
        sums.push(`${createHash("sha256").update(target).digest("hex")}  ${name}`);
      }
      await writeFile(path.join(directory, "SHA256SUMS.txt"), `${sums.join("\n")}\n`);
      await writeFile(
        path.join(directory, "BUILD.json"),
        JSON.stringify({
          platform,
          architecture,
          commit,
          unsigned: true,
          reporting: false,
          autoUpdate: false,
        }),
      );
    }
  }
  return { input, output, commit };
}

test("assembles all six targets and preserves source metadata", async (t) => {
  const { input, output, commit } = await fixture(t);
  const result = await assemblePrivacyRelease(input, output, commit);
  assert.equal(result.builds.length, 6);
  assert.equal(result.assets.length, 14);
  assert.equal(
    (await readFile(path.join(output, "SHA256SUMS.txt"), "utf8")).trim().split("\n").length,
    14,
  );
  assert.equal(
    JSON.parse(await readFile(path.join(output, "BUILD-MANIFEST.json"), "utf8")).builds[0].commit,
    commit,
  );
});

test("rejects tampered installers before publishing", async (t) => {
  const { input, output } = await fixture(t);
  await writeFile(path.join(input, "ZCode-privacy-windows-x64", "windows-x64.exe"), "changed");
  await assert.rejects(assemblePrivacyRelease(input, output), /Checksum mismatch/);
});

test("rejects missing targets and source commit mismatches", async (t) => {
  const { input, output } = await fixture(t);
  await assert.rejects(
    assemblePrivacyRelease(input, output, "b".repeat(40)),
    /Invalid build metadata/,
  );
  await rm(path.join(input, "ZCode-privacy-linux-arm64"), { recursive: true });
  await assert.rejects(assemblePrivacyRelease(input, output), /ENOENT/);
});

import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { ensureTelemetryDeviceMid } from "../src/telemetry/telemetryCore.js";
it("does not create a persistent reporting identifier or telemetry state file", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "privacy-identity-"));
  const randomUUID = vi.fn();
  try {
    expect(await ensureTelemetryDeviceMid({ homeDir, randomUUID })).toBe(
      await ensureTelemetryDeviceMid({}),
    );
    expect(randomUUID).not.toHaveBeenCalled();
    expect(await readdir(homeDir)).toEqual([]);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
});

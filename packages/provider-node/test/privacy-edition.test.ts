import { describe, expect, it, vi } from "vitest";
import { ZCodeBuiltinRemoteSynchronizer } from "../src/zcode-builtin-remote-synchronizer.js";
import type { NodeZCodeBuiltinProviderConfigSource } from "../src/zcode-builtin-provider-config-source.js";

describe("privacy edition vendor registry refresh", () => {
  it("does not resolve a vendor origin, acquire a file lease or download config even when forced", async () => {
    const resolveEndpointKey = vi.fn();
    const fetchRelease = vi.fn();
    const synchronizer = new ZCodeBuiltinRemoteSynchronizer({
      source: {} as NodeZCodeBuiltinProviderConfigSource,
      controlFilePath: "must-not-create-this-file/control.json",
      resolveEndpointKey,
      fetchRelease,
    });
    expect(await synchronizer.refresh()).toBe("skipped");
    expect(await synchronizer.refresh({ force: true })).toBe("skipped");
    expect(resolveEndpointKey).not.toHaveBeenCalled();
    expect(fetchRelease).not.toHaveBeenCalled();
    synchronizer.dispose();
    expect(await synchronizer.refresh()).toBe("disposed");
  });
});

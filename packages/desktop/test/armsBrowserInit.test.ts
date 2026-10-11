import { expect, it, vi } from "vitest";
import {
  initArmsBrowserRumOnce,
  scheduleArmsBrowserRumInit,
} from "../src/shared/armsBrowserInit.js";
it("does not initialize browser reporting or create retry timers", () => {
  const timer = vi.spyOn(globalThis, "setTimeout");
  expect(initArmsBrowserRumOnce("production")).toBe(true);
  scheduleArmsBrowserRumInit("production", 100);
  expect(timer).not.toHaveBeenCalled();
  timer.mockRestore();
});

import { describe, expect, it, vi } from "vitest";

import {
  createShakePreferenceController,
  watchForShake,
  type AccelerationSample,
  type MotionPort,
} from "./motion";

class FakeMotion implements MotionPort {
  listener: ((sample: AccelerationSample) => void) | null = null;
  removed = false;
  async subscribe(listener: (sample: AccelerationSample) => void) {
    this.listener = listener;
    return {
      remove: async () => {
        this.removed = true;
      },
    };
  }
  emit(x: number, y: number, z: number) {
    this.listener?.({ x, y, z });
  }
}

describe("shake shortcut", () => {
  it("detects a strong acceleration change and respects cooldown", async () => {
    const motion = new FakeMotion();
    const handler = vi.fn();
    let time = 0;
    const subscription = await watchForShake(handler, motion, {
      threshold: 18,
      cooldownMs: 1500,
      now: () => time,
    });

    motion.emit(0, 0, 9.8);
    time = 100;
    motion.emit(25, 0, 9.8);
    time = 200;
    motion.emit(0, 25, 9.8);
    time = 1700;
    motion.emit(25, 0, 9.8);

    expect(handler).toHaveBeenCalledTimes(2);
    await subscription.remove();
    expect(motion.removed).toBe(true);
  });

  it("ignores ordinary device movement", async () => {
    const motion = new FakeMotion();
    const handler = vi.fn();
    await watchForShake(handler, motion);
    motion.emit(0, 0, 9.8);
    motion.emit(1, 1, 9.5);
    expect(handler).not.toHaveBeenCalled();
  });

  it("subscribes only while the shake preference is enabled", async () => {
    const motion = new FakeMotion();
    const controller = createShakePreferenceController(vi.fn(), motion);

    await controller.setEnabled(false);
    expect(motion.listener).toBeNull();
    await controller.setEnabled(true);
    expect(motion.listener).not.toBeNull();
    await controller.setEnabled(false);
    expect(motion.removed).toBe(true);
  });
});

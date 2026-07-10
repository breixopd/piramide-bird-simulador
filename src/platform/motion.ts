import { Motion } from "@capacitor/motion";

export interface AccelerationSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MotionSubscription {
  remove(): Promise<void>;
}

export interface MotionPort {
  subscribe(listener: (sample: AccelerationSample) => void): Promise<MotionSubscription>;
}

export const capacitorMotionPort: MotionPort = {
  async subscribe(listener) {
    return Motion.addListener("accel", ({ accelerationIncludingGravity }) =>
      listener(accelerationIncludingGravity),
    );
  },
};

export interface ShakeOptions {
  readonly threshold?: number;
  readonly cooldownMs?: number;
  readonly now?: () => number;
}

export async function watchForShake(
  onShake: () => void,
  motion: MotionPort = capacitorMotionPort,
  options: ShakeOptions = {},
): Promise<MotionSubscription> {
  const threshold = options.threshold ?? 18;
  const cooldownMs = options.cooldownMs ?? 1500;
  const now = options.now ?? Date.now;
  let previous: AccelerationSample | null = null;
  let lastShakeAt = Number.NEGATIVE_INFINITY;

  return motion.subscribe((sample) => {
    if (previous !== null) {
      const delta = Math.hypot(sample.x - previous.x, sample.y - previous.y, sample.z - previous.z);
      const currentTime = now();
      if (delta >= threshold && currentTime - lastShakeAt >= cooldownMs) {
        lastShakeAt = currentTime;
        onShake();
      }
    }
    previous = sample;
  });
}

export interface ShakePreferenceController {
  setEnabled(enabled: boolean): Promise<void>;
  dispose(): Promise<void>;
}

export function createShakePreferenceController(
  onShake: () => void,
  motion: MotionPort = capacitorMotionPort,
  options: ShakeOptions = {},
): ShakePreferenceController {
  let requested = false;
  let subscription: MotionSubscription | undefined;
  let transition = Promise.resolve();

  const setEnabled = (enabled: boolean): Promise<void> => {
    if (requested === enabled) return transition;
    requested = enabled;
    transition = transition
      .then(async () => {
        await subscription?.remove();
        subscription = undefined;
        if (!requested) return;
        const candidate = await watchForShake(onShake, motion, options);
        if (requested) subscription = candidate;
        else await candidate.remove();
      })
      .catch(() => {
        requested = false;
      });
    return transition;
  };

  return {
    setEnabled,
    async dispose() {
      requested = false;
      await transition;
      await subscription?.remove();
      subscription = undefined;
    },
  };
}

// What a cat's attack does to the fake cursor. Browsers cannot move or slow the real
// pointer, so the page hides it and draws a fake one; an effect decides, frame by
// frame, where that fake cursor is and how it looks.
//
// Every effect is a pure function of its input: no clock, no DOM, no Math.random.
// Anything random derives from `roll` (in [0, 1)), fixed once per attack — an effect
// that wants fresh numbers every frame seeds `createRandom` from it (with the moment,
// or with what it keeps in its `state`).

import { createRandom } from './random';

export type Vec = { x: number; y: number };
export type Size = { width: number; height: number };

export type CursorLook = {
  x: number;
  y: number;
  visible: boolean;
  /** 1 is normal size; the cursor scales from its tip. */
  scale: number;
  /** Blur radius in px. */
  blur: number;
  opacity: number;
  /** Extra, identical-looking cursors drawn at these points (at most MAX_DECOYS). */
  decoys?: Vec[];
  /** A coloured glow round the cursor (e.g. ice), as a CSS colour. */
  tint?: string;
};

export const MAX_DECOYS = 4;

/** Longest an effect may run; clicks are blocked for its whole duration. */
export const MAX_EFFECT_MS = 10_000;

export type EffectInput<S = unknown> = {
  /** The real pointer, now. */
  real: Vec;
  /** How far the real pointer moved since the previous frame. */
  delta: Vec;
  /** The fake cursor on the previous frame. */
  previous: CursorLook;
  /** The real pointer when the attack began. */
  start: Vec;
  /** The centre of the attacking cat. */
  cat: Vec;
  /** Milliseconds since the attack began. */
  elapsed: number;
  /** Milliseconds since the previous frame of this attack (0 on its first frame). */
  dt: number;
  viewport: Size;
  /** One random number in [0, 1), fixed for the whole attack. */
  roll: number;
  /** What this effect returned as `state` on its previous frame; undefined on the first. */
  state: S | undefined;
};

export type EffectFrame<S = unknown> = {
  look: CursorLook;
  /** Carried to the next frame of this attack as `input.state` (velocity, history, ...). */
  state?: S;
};

export type Effect<S = unknown> = {
  id: string;
  /** Shown on the /cats page, e.g. "Vanish". */
  name: string;
  /** One line for the /cats page. */
  description: string;
  /** At most MAX_EFFECT_MS. */
  durationMs: number;
  step(input: EffectInput<S>): EffectFrame<S>;
};

export const restingLook = (at: Vec): CursorLook => ({
  x: at.x,
  y: at.y,
  visible: true,
  scale: 1,
  blur: 0,
  opacity: 1,
});

export function clampToViewport(point: Vec, viewport: Size): Vec {
  return {
    x: Math.min(Math.max(point.x, 0), Math.max(viewport.width - 1, 0)),
    y: Math.min(Math.max(point.y, 0), Math.max(viewport.height - 1, 0)),
  };
}

/** A unit vector from `from` towards `to`, or one pointing at `fallbackAngle` if they coincide. */
export function direction(from: Vec, to: Vec, fallbackAngle: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) };
  return { x: dx / length, y: dy / length };
}

const easeOutCubic = (t: number) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;

export const vanish: Effect = {
  id: 'vanish',
  name: 'Vanish',
  description: 'Your cursor disappears for 3 seconds.',
  durationMs: 3000,
  step: ({ real }) => ({ look: { ...restingLook(real), visible: false } }),
};

export const HEAVY_SPEED = 0.3;

export const heavy: Effect = {
  id: 'heavy',
  name: 'Heavy',
  description: 'Your cursor moves at 30% speed for 5 seconds.',
  durationMs: 5000,
  step: ({ previous, delta, viewport }) => ({
    look: restingLook(
      clampToViewport(
        { x: previous.x + delta.x * HEAVY_SPEED, y: previous.y + delta.y * HEAVY_SPEED },
        viewport
      )
    ),
  }),
};

export const KNOCKBACK_DISTANCE = 300;
export const KNOCKBACK_FLIGHT_MS = 250;

export const knockback: Effect = {
  id: 'knockback',
  name: 'Knockback',
  description: 'Your cursor is flung 300 px away from the cat.',
  durationMs: 1500,
  step: ({ real, start, cat, elapsed, viewport, roll }) => {
    const away = direction(cat, start, roll * 2 * Math.PI);
    const distance = KNOCKBACK_DISTANCE * easeOutCubic(elapsed / KNOCKBACK_FLIGHT_MS);
    return {
      look: restingLook(
        clampToViewport({ x: real.x + away.x * distance, y: real.y + away.y * distance }, viewport)
      ),
    };
  },
};

export const reverse: Effect = {
  id: 'reverse',
  name: 'Reverse',
  description: 'Your cursor moves the opposite way for 4 seconds.',
  durationMs: 4000,
  step: ({ previous, delta, viewport }) => ({
    look: restingLook(
      clampToViewport({ x: previous.x - delta.x, y: previous.y - delta.y }, viewport)
    ),
  }),
};

export const JITTER_PX = 15;
export const JITTER_STEP_MS = 40;

export const jitter: Effect = {
  id: 'jitter',
  name: 'Jitter',
  description: 'Your cursor shakes for 4 seconds.',
  durationMs: 4000,
  step: ({ real, elapsed, roll, viewport }) => {
    // A new offset every JITTER_STEP_MS, the same for the same moment of the same
    // attack: pure, and independent of the frame rate.
    const slot = Math.floor(elapsed / JITTER_STEP_MS);
    const random = createRandom(Math.floor(roll * 2 ** 31) ^ Math.imul(slot + 1, 0x9e3779b1));
    const offset = {
      x: random.range(-JITTER_PX, JITTER_PX),
      y: random.range(-JITTER_PX, JITTER_PX),
    };
    return {
      look: restingLook(clampToViewport({ x: real.x + offset.x, y: real.y + offset.y }, viewport)),
    };
  },
};

export const ICE = '#7dd3fc';

export const freeze: Effect = {
  id: 'freeze',
  name: 'Freeze',
  description: 'Your cursor is frozen in place for 2.5 seconds.',
  durationMs: 2500,
  step: ({ start }) => ({ look: { ...restingLook(start), tint: ICE } }),
};

export const DRIFT_PX_PER_S = 110;

export const drift: Effect = {
  id: 'drift',
  name: 'Drift',
  description: 'Your cursor is pushed steadily in one direction for 5 seconds.',
  durationMs: 5000,
  step: ({ real, elapsed, roll, viewport }) => {
    const angle = roll * 2 * Math.PI;
    const distance = (DRIFT_PX_PER_S * elapsed) / 1000;
    return {
      look: restingLook(
        clampToViewport(
          { x: real.x + Math.cos(angle) * distance, y: real.y + Math.sin(angle) * distance },
          viewport
        )
      ),
    };
  },
};

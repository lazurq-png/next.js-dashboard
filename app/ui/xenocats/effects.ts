// What a cat's attack does to the fake cursor. Browsers cannot move or slow the real
// pointer, so the page hides it and draws a fake one; an effect decides, frame by
// frame, where that fake cursor is and how it looks.
//
// Every effect is a pure function of its input: no clock, no DOM, no Math.random.
// Anything random derives from `roll` (in [0, 1)), fixed once per attack — an effect
// that wants fresh numbers every frame seeds `createRandom` from it and keeps the
// generator's output in its `state`.

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

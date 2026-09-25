// The fake cursor's state machine, with no DOM and no clock of its own: callers pass
// the pointer position and the time in, so tests can drive it frame by frame.

import {
  type CursorLook,
  type Effect,
  MAX_EFFECT_MS,
  type Size,
  type Vec,
  restingLook,
} from './effects';
import { type Random, createRandom, freshSeed } from './random';

type Attack = {
  effect: Effect;
  startedAt: number;
  start: Vec;
  cat: Vec;
  roll: number;
  /** The effect's own state from its previous frame. */
  state: unknown;
  /** When the previous frame of this attack ran, or null before its first. */
  lastFrameAt: number | null;
};

export type CursorController = ReturnType<typeof createCursorController>;

export function createCursorController(options: { viewport: Size; random?: Random }) {
  const random = options.random ?? createRandom(freshSeed());
  let viewport = options.viewport;
  let real: Vec | null = null;
  /** False while the pointer is outside the page; the fake cursor then hides. */
  let present = false;
  let pendingDelta: Vec = { x: 0, y: 0 };
  let look: CursorLook = { ...restingLook({ x: 0, y: 0 }), visible: false };
  let attack: Attack | null = null;

  const isActive = (now: number) =>
    attack !== null && now - attack.startedAt < attack.effect.durationMs;

  return {
    /** The real pointer moved to `point`. */
    pointerMove(point: Vec) {
      if (real) {
        pendingDelta = {
          x: pendingDelta.x + point.x - real.x,
          y: pendingDelta.y + point.y - real.y,
        };
      }
      real = point;
      present = true;
    },

    /** The pointer left the page (or the window lost focus). Hidden until it moves again. */
    pointerLeave() {
      present = false;
    },

    resize(size: Size) {
      viewport = size;
    },

    /**
     * Starts `effect` from a cat at `cat`. Only one effect runs at a time: returns
     * false, and changes nothing, while another is active or before the pointer
     * has been seen.
     */
    attack(effect: Effect, cat: Vec, now: number): boolean {
      const duration = effect.durationMs;
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_EFFECT_MS) {
        // Clicks are blocked for the whole effect, so an unbounded one would lock the page.
        throw new RangeError(`Effect "${effect.id}" must last 1–${MAX_EFFECT_MS} ms.`);
      }
      if (isActive(now) || !real) return false;
      attack = {
        effect,
        startedAt: now,
        start: real,
        cat,
        roll: random.next(),
        state: undefined,
        lastFrameAt: null,
      };
      return true;
    },

    /** True while an effect runs; clicks are blocked for exactly that long. */
    isBlocking(now: number): boolean {
      return isActive(now);
    },

    /** Where the fake cursor was last drawn, or null before the pointer has been seen. */
    position(): Vec | null {
      return real ? { x: look.x, y: look.y } : null;
    },

    /** False while the pointer is outside the page (or the window is unfocused). */
    isPresent(): boolean {
      return present;
    },

    activeEffectId(now: number): string | null {
      return isActive(now) ? attack!.effect.id : null;
    },

    /** Advances one frame and returns how the fake cursor should look. */
    frame(now: number): CursorLook {
      const delta = pendingDelta;
      pendingDelta = { x: 0, y: 0 };
      if (!real) return look;

      if (attack && isActive(now)) {
        const result = attack.effect.step({
          real,
          delta,
          previous: look,
          start: attack.start,
          cat: attack.cat,
          elapsed: Math.max(now - attack.startedAt, 0),
          dt: attack.lastFrameAt === null ? 0 : Math.max(now - attack.lastFrameAt, 0),
          viewport,
          roll: attack.roll,
          state: attack.state,
        });
        attack.state = result.state;
        attack.lastFrameAt = now;
        look = result.look;
      } else {
        // No effect, or it just ended: the fake cursor snaps back onto the real one.
        attack = null;
        look = restingLook(real);
      }
      return present ? look : { ...look, visible: false, decoys: undefined };
    },
  };
}

import { describe, expect, it } from 'vitest';
import {
  type Effect,
  type EffectInput,
  HEAVY_SPEED,
  KNOCKBACK_DISTANCE,
  KNOCKBACK_FLIGHT_MS,
  clampToViewport,
  direction,
  heavy,
  knockback,
  restingLook,
  vanish,
} from '@/app/ui/xenocats/effects';

const viewport = { width: 1000, height: 800 };

function input(overrides: Partial<EffectInput> = {}): EffectInput {
  const real = overrides.real ?? { x: 500, y: 400 };
  return {
    real,
    delta: { x: 0, y: 0 },
    previous: restingLook(real),
    start: real,
    cat: { x: 400, y: 400 },
    elapsed: 0,
    dt: 0,
    viewport,
    roll: 0,
    state: undefined,
    ...overrides,
  };
}

const lookOf = (effect: Effect, overrides: Partial<EffectInput> = {}) =>
  effect.step(input(overrides)).look;

describe('helpers', () => {
  it('clampToViewport keeps a point on screen', () => {
    expect(clampToViewport({ x: -10, y: 900 }, viewport)).toEqual({ x: 0, y: 799 });
    expect(clampToViewport({ x: 20, y: 30 }, viewport)).toEqual({ x: 20, y: 30 });
  });

  it('direction is a unit vector, with a fallback when the points coincide', () => {
    const d = direction({ x: 0, y: 0 }, { x: 3, y: 4 }, 0);
    expect(d.x).toBeCloseTo(0.6);
    expect(d.y).toBeCloseTo(0.8);
    const fallback = direction({ x: 1, y: 1 }, { x: 1, y: 1 }, Math.PI / 2);
    expect(fallback.x).toBeCloseTo(0);
    expect(fallback.y).toBeCloseTo(1);
  });
});

describe('vanish', () => {
  it('hides the cursor wherever the pointer is, for 3 seconds', () => {
    expect(vanish.durationMs).toBe(3000);
    expect(lookOf(vanish, { real: { x: 10, y: 20 }, elapsed: 1500 })).toMatchObject({
      x: 10,
      y: 20,
      visible: false,
    });
  });
});

describe('heavy', () => {
  it('moves the cursor at 30% of the real movement, for 5 seconds', () => {
    expect(heavy.durationMs).toBe(5000);
    const look = lookOf(heavy, {
      previous: restingLook({ x: 100, y: 100 }),
      delta: { x: 100, y: -50 },
    });
    expect(look.x).toBeCloseTo(100 + 100 * HEAVY_SPEED);
    expect(look.y).toBeCloseTo(100 - 50 * HEAVY_SPEED);
    expect(look.visible).toBe(true);
  });

  it('accumulates over frames and lags ever further behind', () => {
    let previous = restingLook({ x: 0, y: 0 });
    for (let i = 0; i < 10; i++) {
      previous = lookOf(heavy, { previous, delta: { x: 10, y: 0 } });
    }
    expect(previous.x).toBeCloseTo(10 * 10 * HEAVY_SPEED);
  });

  it('cannot leave the screen', () => {
    const look = lookOf(heavy, {
      previous: restingLook({ x: 5, y: 5 }),
      delta: { x: -100, y: -100 },
    });
    expect(look).toMatchObject({ x: 0, y: 0 });
  });
});

describe('knockback', () => {
  it('flings the cursor directly away from the cat', () => {
    // Cat to the left of the pointer: the cursor flies right.
    const look = lookOf(knockback, { elapsed: KNOCKBACK_FLIGHT_MS });
    expect(look.x).toBeCloseTo(500 + KNOCKBACK_DISTANCE);
    expect(look.y).toBeCloseTo(400);
  });

  it('starts at the pointer and eases out to the full distance', () => {
    const at = (elapsed: number) => lookOf(knockback, { elapsed }).x - 500;
    expect(at(0)).toBeCloseTo(0);
    expect(at(KNOCKBACK_FLIGHT_MS / 2)).toBeGreaterThan(KNOCKBACK_DISTANCE / 2);
    expect(at(KNOCKBACK_FLIGHT_MS * 3)).toBeCloseTo(KNOCKBACK_DISTANCE);
  });

  it('keeps the offset while the pointer moves', () => {
    const look = lookOf(knockback, {
      real: { x: 520, y: 410 },
      start: { x: 500, y: 400 },
      elapsed: 1000,
    });
    expect(look.x).toBeCloseTo(520 + KNOCKBACK_DISTANCE);
    expect(look.y).toBeCloseTo(410);
  });

  it('uses the attack roll when the cat sits exactly on the pointer', () => {
    const look = lookOf(knockback, { cat: { x: 500, y: 400 }, elapsed: 1000, roll: 0.25 });
    // roll 0.25 → a quarter turn → straight down.
    expect(look.x).toBeCloseTo(500);
    expect(look.y).toBeCloseTo(400 + KNOCKBACK_DISTANCE);
  });

  it('stays on screen', () => {
    const look = lookOf(knockback, {
      real: { x: 900, y: 400 },
      start: { x: 900, y: 400 },
      elapsed: 1000,
    });
    expect(look.x).toBe(viewport.width - 1);
  });
});

describe('every effect', () => {
  it.each([vanish, heavy, knockback])('$id lasts between 0 and 10 seconds', (effect) => {
    expect(effect.durationMs).toBeGreaterThan(0);
    expect(effect.durationMs).toBeLessThanOrEqual(10_000);
  });
});

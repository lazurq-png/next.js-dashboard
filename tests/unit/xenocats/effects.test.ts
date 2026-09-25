import { describe, expect, it } from 'vitest';
import {
  type Effect,
  type EffectInput,
  DRIFT_PX_PER_S,
  HEAVY_SPEED,
  ICE,
  JITTER_PX,
  JITTER_STEP_MS,
  KNOCKBACK_DISTANCE,
  KNOCKBACK_FLIGHT_MS,
  clampToViewport,
  direction,
  drift,
  freeze,
  heavy,
  jitter,
  knockback,
  restingLook,
  reverse,
  vanish,
  DECOY_COUNT,
  DECOY_RING,
  DRUNK_AMPLITUDE,
  GIANT_SCALE,
  MAGNET_PULL,
  MAGNET_RAMP_MS,
  ORBIT_PERIOD_MS,
  ORBIT_RADIUS,
  TELEPORT_EVERY_MS,
  TELEPORT_JUMPS,
  TELEPORT_MARGIN,
  TINY_SCALE,
  decoys,
  drunk,
  giant,
  magnet,
  orbit,
  teleport,
  tiny,
  BLUR_PX,
  DELAY_MS,
  FALL_PX_PER_S,
  type CursorLook,
  axisLock,
  blur,
  bounce,
  delay,
  fall,
  spiral,
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
  it.each([
    vanish,
    heavy,
    knockback,
    reverse,
    jitter,
    freeze,
    drift,
    teleport,
    magnet,
    orbit,
    decoys,
    drunk,
    tiny,
    giant,
  ])('$id lasts between 0 and 10 seconds', (effect) => {
    expect(effect.durationMs).toBeGreaterThan(0);
    expect(effect.durationMs).toBeLessThanOrEqual(10_000);
  });
});

describe('reverse', () => {
  it('moves the cursor opposite to the pointer, for 4 seconds', () => {
    expect(reverse.durationMs).toBe(4000);
    const look = lookOf(reverse, {
      previous: restingLook({ x: 500, y: 400 }),
      delta: { x: 30, y: -20 },
    });
    expect(look).toMatchObject({ x: 470, y: 420, visible: true });
  });

  it('stays on screen', () => {
    const look = lookOf(reverse, {
      previous: restingLook({ x: 5, y: 5 }),
      delta: { x: 50, y: 50 },
    });
    expect(look).toMatchObject({ x: 0, y: 0 });
  });
});

describe('jitter', () => {
  it('is the roster’s ±15 px', () => {
    expect(JITTER_PX).toBe(15);
  });

  it('really shakes: offsets reach well out towards 15 px', () => {
    let largest = 0;
    for (let elapsed = 0; elapsed < 4000; elapsed += JITTER_STEP_MS) {
      const look = lookOf(jitter, { elapsed, roll: 0.37 });
      largest = Math.max(largest, Math.abs(look.x - 500), Math.abs(look.y - 400));
    }
    expect(largest).toBeGreaterThan(10);
  });

  it('shakes the cursor within ±15 px of the pointer, for 4 seconds', () => {
    expect(jitter.durationMs).toBe(4000);
    const offsets = new Set<string>();
    for (let elapsed = 0; elapsed < 4000; elapsed += 16) {
      const look = lookOf(jitter, { elapsed, roll: 0.37 });
      expect(Math.abs(look.x - 500)).toBeLessThanOrEqual(JITTER_PX);
      expect(Math.abs(look.y - 400)).toBeLessThanOrEqual(JITTER_PX);
      offsets.add(`${look.x.toFixed(2)},${look.y.toFixed(2)}`);
    }
    // A new offset every 40 ms: about 100 distinct positions over 4 s.
    expect(offsets.size).toBeGreaterThan(80);
  });

  it('is the same for the same moment of the same attack, whatever the frame rate', () => {
    const a = lookOf(jitter, { elapsed: 1234, roll: 0.5 });
    const b = lookOf(jitter, { elapsed: 1234, roll: 0.5 });
    const sameSlot = lookOf(jitter, {
      elapsed: 1234 + (JITTER_STEP_MS - (1234 % JITTER_STEP_MS)) - 1,
      roll: 0.5,
    });
    expect(a).toEqual(b);
    expect(sameSlot).toEqual(a);
    expect(lookOf(jitter, { elapsed: 1234, roll: 0.51 })).not.toEqual(a);
  });
});

describe('freeze', () => {
  it('holds the cursor where the pointer was when the attack began, iced over, for 2.5 s', () => {
    expect(freeze.durationMs).toBe(2500);
    const look = lookOf(freeze, {
      real: { x: 700, y: 100 },
      start: { x: 500, y: 400 },
      elapsed: 2000,
    });
    expect(look).toMatchObject({ x: 500, y: 400, visible: true, tint: ICE });
  });
});

describe('drift', () => {
  it('drifts at 110 px per second', () => {
    expect(DRIFT_PX_PER_S).toBe(110);
  });

  it('pushes the cursor steadily in one direction, for 5 seconds', () => {
    expect(drift.durationMs).toBe(5000);
    // roll 0 → angle 0 → to the right.
    const at = (elapsed: number) => lookOf(drift, { elapsed, roll: 0 });
    expect(at(0).x).toBeCloseTo(500);
    expect(at(1000).x).toBeCloseTo(500 + DRIFT_PX_PER_S);
    expect(at(2000).x).toBeCloseTo(500 + 2 * DRIFT_PX_PER_S);
    expect(at(2000).y).toBeCloseTo(400);
  });

  it('keeps the pointer’s own movement on top of the drift', () => {
    const look = lookOf(drift, { real: { x: 520, y: 380 }, elapsed: 1000, roll: 0.25 });
    expect(look.x).toBeCloseTo(520);
    expect(look.y).toBeCloseTo(380 + DRIFT_PX_PER_S);
  });

  it('stops at the edge of the screen', () => {
    expect(lookOf(drift, { elapsed: 5000, roll: 0 }).x).toBe(viewport.width - 1);
  });
});

describe('teleport', () => {
  const run = (roll: number, frames: { elapsed: number; real: { x: number; y: number } }[]) => {
    let state: unknown;
    return frames.map(({ elapsed, real }) => {
      const out = teleport.step({ ...input({ real, elapsed, roll }), state } as never);
      state = out.state;
      return out.look;
    });
  };

  it('jumps to a random spot three times, 0.8 s apart', () => {
    expect(teleport.durationMs).toBe(TELEPORT_JUMPS * TELEPORT_EVERY_MS);
    expect(TELEPORT_JUMPS).toBe(3);
    const still = { x: 500, y: 400 };
    const looks = run(
      0.42,
      [0, 400, 800, 1200, 1600, 2000].map((elapsed) => ({ elapsed, real: still }))
    );
    const spots = new Set(looks.map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)}`));
    expect(spots.size).toBe(3);
    // Same spot within a jump, a new one at each 0.8 s mark.
    expect(looks[0]).toEqual(looks[1]);
    expect(looks[2]).not.toEqual(looks[1]);
    expect(looks[4]).not.toEqual(looks[3]);
  });

  it('lands somewhere else on screen, then follows the pointer from there', () => {
    const [first, moved] = run(0.42, [
      { elapsed: 0, real: { x: 500, y: 400 } },
      { elapsed: 300, real: { x: 530, y: 390 } },
    ]);
    expect(first.x).toBeGreaterThanOrEqual(TELEPORT_MARGIN);
    expect(first.x).toBeLessThanOrEqual(viewport.width - TELEPORT_MARGIN);
    expect(moved.x - first.x).toBeCloseTo(30);
    expect(moved.y - first.y).toBeCloseTo(-10);
  });

  it('jumps to the same spots for the same attack', () => {
    const frames = [0, 900, 1700].map((elapsed) => ({ elapsed, real: { x: 500, y: 400 } }));
    expect(run(0.3, frames)).toEqual(run(0.3, frames));
    expect(run(0.3, frames)).not.toEqual(run(0.31, frames));
  });
});

describe('magnet', () => {
  it('pulls the cursor most of the way to the cat, for 4 seconds', () => {
    expect(magnet.durationMs).toBe(4000);
    const cat = { x: 200, y: 400 };
    const at = (elapsed: number) => lookOf(magnet, { cat, elapsed });
    expect(at(0).x).toBeCloseTo(500);
    expect(at(MAGNET_RAMP_MS * 2).x).toBeCloseTo(500 - 300 * MAGNET_PULL);
    // Closer to the cat than the pointer is.
    expect(Math.abs(at(1000).x - cat.x)).toBeLessThan(Math.abs(500 - cat.x) / 2);
  });
});

describe('orbit', () => {
  it('circles the cat at a steady radius, for 3 seconds', () => {
    expect(orbit.durationMs).toBe(3000);
    const cat = { x: 500, y: 300 };
    const start = { x: 500, y: 400 }; // 100 px below the cat
    const points = [0, 150, 300, 450, 600].map((elapsed) =>
      lookOf(orbit, { cat, start, real: start, elapsed })
    );
    for (const p of points) expect(Math.hypot(p.x - cat.x, p.y - cat.y)).toBeCloseTo(100);
    // Starts where the pointer was, then a quarter turn every period / 4.
    expect(points[0].x).toBeCloseTo(500);
    expect(points[0].y).toBeCloseTo(400);
    expect(points[4].y).toBeCloseTo(300 + 100 * Math.cos((2 * Math.PI * 600) / ORBIT_PERIOD_MS));
  });

  it('keeps a usable radius when the pointer was very close to or far from the cat', () => {
    const cat = { x: 500, y: 400 };
    const near = lookOf(orbit, { cat, start: { x: 505, y: 400 }, elapsed: 0 });
    const far = lookOf(orbit, { cat, start: { x: 900, y: 400 }, elapsed: 0 });
    expect(Math.hypot(near.x - cat.x, near.y - cat.y)).toBeCloseTo(ORBIT_RADIUS[0]);
    expect(Math.hypot(far.x - cat.x, far.y - cat.y)).toBeCloseTo(ORBIT_RADIUS[1]);
  });
});

describe('decoys', () => {
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  it('adds three identical cursors that move with yours, for 5 seconds', () => {
    expect(decoys.durationMs).toBe(5000);
    expect(DECOY_COUNT + 1).toBe(4); // four cursors in all
    const a = lookOf(decoys, { real: { x: 500, y: 400 }, roll: 0.6 });
    const b = lookOf(decoys, { real: { x: 520, y: 410 }, roll: 0.6 });
    expect(a.decoys).toHaveLength(DECOY_COUNT);
    a.decoys!.forEach((d, i) => {
      expect(b.decoys![i].x - d.x).toBeCloseTo(20);
      expect(b.decoys![i].y - d.y).toBeCloseTo(10);
    });
    expect(a).toMatchObject({ x: 500, y: 400, visible: true });
  });

  it('keeps its layout for the whole attack: the decoys move exactly as yours does', () => {
    const start = { x: 500, y: 400 };
    for (const roll of [0.1, 0.45, 0.8]) {
      const before = lookOf(decoys, { real: start, start, roll }).decoys!;
      // The pointer crosses into the edge band and into a corner: no jump, no swing.
      for (const moved of [
        { x: 150, y: 400 },
        { x: 480, y: 120 },
      ]) {
        const after = lookOf(decoys, { real: moved, start, roll }).decoys!;
        after.forEach((d, i) => {
          const expected = {
            x: before[i].x + moved.x - start.x,
            y: before[i].y + moved.y - start.y,
          };
          const clamped = expected.x < 0 || expected.y < 0;
          if (!clamped) {
            expect(d.x).toBeCloseTo(expected.x);
            expect(d.y).toBeCloseTo(expected.y);
          }
        });
      }
    }
  });

  it('keeps every cursor clearly apart, for any attack', () => {
    for (let k = 0; k < 50; k++) {
      const look = lookOf(decoys, { real: { x: 500, y: 400 }, roll: k / 50 });
      const all = [{ x: 500, y: 400 }, ...look.decoys!];
      for (const d of look.decoys!) {
        expect(dist(d, all[0])).toBeGreaterThanOrEqual(DECOY_RING[0] - 1e-9);
        expect(dist(d, all[0])).toBeLessThanOrEqual(DECOY_RING[1] + 1e-9);
      }
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) expect(dist(all[i], all[j])).toBeGreaterThan(60);
    }
  });

  it.each([
    [5, 5],
    [995, 795],
    [995, 5],
    [5, 795],
    [500, 5],
    [500, 795],
    [5, 400],
    [995, 400],
  ])('spreads inward at an edge or corner (%i, %i) instead of piling up', (x, y) => {
    for (let k = 0; k < 50; k++) {
      const look = lookOf(decoys, { real: { x, y }, start: { x, y }, roll: k / 50 });
      const all = [{ x, y }, ...look.decoys!];
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) expect(dist(all[i], all[j])).toBeGreaterThan(20);
    }
  });
});

describe('drunk', () => {
  it('wobbles around the pointer, never far, for 5 seconds', () => {
    expect(drunk.durationMs).toBe(5000);
    let largest = 0;
    for (let elapsed = 0; elapsed < 5000; elapsed += 16) {
      const look = lookOf(drunk, { elapsed });
      const off = Math.hypot(look.x - 500, look.y - 400);
      expect(off).toBeLessThanOrEqual(DRUNK_AMPLITUDE * 1.2);
      largest = Math.max(largest, off);
    }
    expect(largest).toBeGreaterThan(DRUNK_AMPLITUDE * 0.8);
  });
});

describe('tiny and giant', () => {
  it('Tiny shrinks the cursor to a quarter for 6 s; Giant grows it fourfold for 5 s', () => {
    expect(tiny.durationMs).toBe(6000);
    expect(giant.durationMs).toBe(5000);
    expect(TINY_SCALE).toBe(0.25);
    expect(GIANT_SCALE).toBe(4);
    expect(lookOf(tiny)).toMatchObject({ x: 500, y: 400, scale: 0.25, visible: true });
    expect(lookOf(giant)).toMatchObject({ x: 500, y: 400, scale: 4, visible: true });
  });
});

/** Runs an effect frame by frame, carrying its state, like the controller does. */
function play(
  effect: Effect,
  frames: Partial<EffectInput>[],
  base: Partial<EffectInput> = {}
): CursorLook[] {
  let state: unknown;
  let previous = restingLook(base.real ?? { x: 500, y: 400 });
  let last = 0;
  return frames.map((frame) => {
    const elapsed = frame.elapsed ?? 0;
    const out = effect.step({
      ...input({ ...base, ...frame }),
      previous,
      dt: elapsed - last,
      state,
    });
    last = elapsed;
    state = out.state;
    previous = out.look;
    return out.look;
  });
}

describe('delay', () => {
  it('shows where the pointer was 800 ms ago, for 5 seconds', () => {
    expect(delay.durationMs).toBe(5000);
    expect(DELAY_MS).toBe(800);
    // The pointer moves right 10 px every 100 ms.
    const frames = Array.from({ length: 30 }, (_, i) => ({
      elapsed: i * 100,
      real: { x: 500 + i * 10, y: 400 },
    }));
    const looks = play(delay, frames, { start: { x: 500, y: 400 } });
    // Before 800 ms it waits where the attack began...
    expect(looks[5]).toMatchObject({ x: 500, y: 400 });
    // ...then lags exactly 800 ms (80 px) behind.
    expect(looks[20].x).toBeCloseTo(500 + 12 * 10);
    expect(looks[29].x).toBeCloseTo(500 + 21 * 10);
  });

  it('keeps a bounded trail however long it runs', () => {
    let state: { trail: unknown[] } | undefined;
    for (let t = 0; t <= 5000; t += 16) {
      state = delay.step({ ...input({ elapsed: t }), state } as never).state as never;
    }
    expect(state!.trail.length).toBeLessThan(80);
  });
});

describe('fall', () => {
  it('sinks steadily unless you move up, for 4 seconds', () => {
    expect(fall.durationMs).toBe(4000);
    const still = play(fall, [{ elapsed: 0 }, { elapsed: 500 }, { elapsed: 1000 }]);
    expect(still[2].y - still[0].y).toBeCloseTo(FALL_PX_PER_S);
    // Moving up as fast as it sinks holds it level.
    const fighting = play(fall, [
      { elapsed: 0 },
      { elapsed: 500, delta: { x: 0, y: -FALL_PX_PER_S / 2 } },
      { elapsed: 1000, delta: { x: 0, y: -FALL_PX_PER_S / 2 } },
    ]);
    expect(fighting[2].y).toBeCloseTo(fighting[0].y);
  });

  it('stops at the bottom edge', () => {
    const looks = play(fall, [{ elapsed: 0 }, { elapsed: 4000 }]);
    expect(looks[1].y).toBe(viewport.height - 1);
  });
});

describe('blur', () => {
  it('blurs the cursor and makes it half-transparent, for 5 seconds', () => {
    expect(blur.durationMs).toBe(5000);
    expect(lookOf(blur)).toMatchObject({
      x: 500,
      y: 400,
      blur: BLUR_PX,
      opacity: 0.5,
      visible: true,
    });
  });
});

describe('spiral', () => {
  it('spirals the cursor in to the middle of the screen over 4 seconds', () => {
    expect(spiral.durationMs).toBe(4000);
    const centre = { x: viewport.width / 2, y: viewport.height / 2 };
    const start = { x: 900, y: 700 };
    const at = (elapsed: number) => lookOf(spiral, { start, real: start, elapsed });
    const d = (p: { x: number; y: number }) => Math.hypot(p.x - centre.x, p.y - centre.y);
    expect(at(0).x).toBeCloseTo(900);
    expect(d(at(1000))).toBeLessThan(d(start));
    expect(d(at(3000))).toBeLessThan(d(at(2000)));
    expect(d(at(4000))).toBeCloseTo(0);
    // It turns as it goes: the angle keeps changing.
    const angle = (p: { x: number; y: number }) => Math.atan2(p.y - centre.y, p.x - centre.x);
    expect(angle(at(1000))).not.toBeCloseTo(angle(start));
  });
});

describe('bounce', () => {
  it('launches away from the cat, keeps its speed and bounces off the edges, for 4 s', () => {
    expect(bounce.durationMs).toBe(4000);
    const frames = Array.from({ length: 250 }, (_, i) => ({ elapsed: i * 16 }));
    const looks = play(bounce, frames, { cat: { x: 400, y: 400 } });
    // It first flies right, away from the cat.
    expect(looks[5].x).toBeGreaterThan(looks[0].x);
    for (const look of looks) {
      expect(look.x).toBeGreaterThanOrEqual(0);
      expect(look.x).toBeLessThanOrEqual(viewport.width - 1);
    }
    // It reached the right edge and came back: momentum kept, direction reversed.
    const furthest = Math.max(...looks.map((l) => l.x));
    expect(furthest).toBeGreaterThan(viewport.width - 20);
    expect(looks.at(-1)!.x).toBeLessThan(furthest - 100);
  });

  it('ignores the pointer once launched', () => {
    const a = play(bounce, [{ elapsed: 0 }, { elapsed: 100 }], { cat: { x: 400, y: 400 } });
    const b = play(
      bounce,
      [{ elapsed: 0 }, { elapsed: 100, real: { x: 100, y: 100 }, delta: { x: -400, y: -300 } }],
      { cat: { x: 400, y: 400 } }
    );
    expect(b[1]).toEqual(a[1]);
  });
});

describe('axis lock', () => {
  it('lets the cursor move only sideways, or only up and down, for 5 seconds', () => {
    expect(axisLock.durationMs).toBe(5000);
    const diagonal = { delta: { x: 30, y: 40 } };
    expect(lookOf(axisLock, { ...diagonal, roll: 0.2 })).toMatchObject({ x: 530, y: 400 });
    expect(lookOf(axisLock, { ...diagonal, roll: 0.7 })).toMatchObject({ x: 500, y: 440 });
  });
});

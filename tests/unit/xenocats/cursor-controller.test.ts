import { describe, expect, it } from 'vitest';
import { createCursorController } from '@/app/ui/xenocats/cursor-controller';
import { type Effect, heavy, knockback, restingLook, vanish } from '@/app/ui/xenocats/effects';
import { createRandom } from '@/app/ui/xenocats/random';

const viewport = { width: 1000, height: 800 };
const cat = { x: 100, y: 100 };

function controller() {
  return createCursorController({ viewport, random: createRandom(1) });
}

describe('cursor controller', () => {
  it('stays hidden until the pointer has been seen, and refuses attacks until then', () => {
    const c = controller();
    expect(c.frame(0).visible).toBe(false);
    expect(c.attack(vanish, cat, 0)).toBe(false);
  });

  it('follows the real pointer exactly when no effect runs', () => {
    const c = controller();
    c.pointerMove({ x: 10, y: 20 });
    expect(c.frame(0)).toMatchObject({ x: 10, y: 20, visible: true, scale: 1 });
    c.pointerMove({ x: 30, y: 40 });
    expect(c.frame(16)).toMatchObject({ x: 30, y: 40 });
  });

  it('blocks clicks only while an effect runs', () => {
    const c = controller();
    c.pointerMove({ x: 10, y: 20 });
    expect(c.isBlocking(0)).toBe(false);
    expect(c.attack(vanish, cat, 1000)).toBe(true);
    expect(c.isBlocking(1000)).toBe(true);
    expect(c.isBlocking(1000 + vanish.durationMs - 1)).toBe(true);
    expect(c.isBlocking(1000 + vanish.durationMs)).toBe(false);
  });

  it('runs one effect at a time', () => {
    const c = controller();
    c.pointerMove({ x: 10, y: 20 });
    expect(c.attack(vanish, cat, 0)).toBe(true);
    expect(c.attack(heavy, cat, 100)).toBe(false);
    expect(c.activeEffectId(100)).toBe('vanish');
    // Once the first has ended, the next may start.
    expect(c.attack(heavy, cat, vanish.durationMs)).toBe(true);
    expect(c.activeEffectId(vanish.durationMs)).toBe('heavy');
  });

  it('applies the effect frame by frame, then snaps back to the real pointer', () => {
    const c = controller();
    c.pointerMove({ x: 500, y: 400 });
    c.frame(0);
    c.attack(heavy, cat, 0);
    c.pointerMove({ x: 600, y: 400 });
    expect(c.frame(16).x).toBeCloseTo(530);
    c.pointerMove({ x: 700, y: 400 });
    expect(c.frame(32).x).toBeCloseTo(560);
    // After the effect: back on the real pointer.
    expect(c.frame(heavy.durationMs + 1)).toMatchObject({ x: 700, y: 400, visible: true });
    expect(c.activeEffectId(heavy.durationMs + 1)).toBeNull();
  });

  it('adds up pointer moves between frames', () => {
    const c = controller();
    c.pointerMove({ x: 500, y: 400 });
    c.frame(0);
    c.attack(heavy, cat, 0);
    c.pointerMove({ x: 550, y: 400 });
    c.pointerMove({ x: 600, y: 400 });
    expect(c.frame(16).x).toBeCloseTo(530);
  });

  it('knockback flies away from the cat that attacked', () => {
    const c = controller();
    c.pointerMove({ x: 500, y: 400 });
    c.attack(knockback, { x: 500, y: 300 }, 0);
    const look = c.frame(1000);
    expect(look.x).toBeCloseTo(500);
    expect(look.y).toBeCloseTo(700);
  });

  it('gives an effect its own state and the time between frames', () => {
    // A stateful effect: counts its frames and remembers the dt it was given.
    type Memo = { frames: number; dts: number[] };
    const counting: Effect<Memo> = {
      id: 'counting',
      name: 'Counting',
      description: 'test only',
      durationMs: 1000,
      step: ({ real, state, dt }) => {
        const memo = state ?? { frames: 0, dts: [] };
        const next = { frames: memo.frames + 1, dts: [...memo.dts, dt] };
        return { look: { ...restingLook(real), decoys: [{ x: next.frames, y: 0 }] }, state: next };
      },
    };
    const c = controller();
    c.pointerMove({ x: 10, y: 10 });
    c.attack(counting, cat, 100);
    c.frame(100);
    c.frame(116);
    const look = c.frame(150);
    expect(look.decoys).toEqual([{ x: 3, y: 0 }]);
    // The next attack starts from fresh state.
    c.frame(2000);
    c.attack(counting, cat, 2000);
    expect(c.frame(2000).decoys).toEqual([{ x: 1, y: 0 }]);
  });

  it('passes dt: 0 on an attack’s first frame and the gap afterwards', () => {
    const dts: number[] = [];
    const recording: Effect = {
      id: 'recording',
      name: 'Recording',
      description: 'test only',
      durationMs: 1000,
      step: ({ real, dt }) => {
        dts.push(dt);
        return { look: restingLook(real) };
      },
    };
    const c = controller();
    c.pointerMove({ x: 10, y: 10 });
    c.attack(recording, cat, 0);
    c.frame(0);
    c.frame(16);
    c.frame(50);
    expect(dts).toEqual([0, 16, 34]);
  });

  it('refuses an effect that could block clicks for too long', () => {
    const c = controller();
    c.pointerMove({ x: 10, y: 10 });
    const forever: Effect = { ...vanish, id: 'forever', durationMs: Infinity };
    const long: Effect = { ...vanish, id: 'long', durationMs: 10_001 };
    expect(() => c.attack(forever, cat, 0)).toThrow(RangeError);
    expect(() => c.attack(long, cat, 0)).toThrow(RangeError);
    expect(c.isBlocking(0)).toBe(false);
  });

  it('hides the cursor while the pointer is outside the page', () => {
    const c = controller();
    c.pointerMove({ x: 10, y: 10 });
    c.pointerLeave();
    expect(c.frame(0).visible).toBe(false);
    c.pointerMove({ x: 12, y: 10 });
    expect(c.frame(16)).toMatchObject({ x: 12, visible: true });
  });

  it('keeps the cursor inside a resized viewport', () => {
    const c = controller();
    c.resize({ width: 200, height: 200 });
    c.pointerMove({ x: 150, y: 150 });
    c.attack(knockback, { x: 100, y: 150 }, 0);
    expect(c.frame(1000).x).toBe(199);
  });
});

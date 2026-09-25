import { describe, expect, it } from 'vitest';
import { createRandom } from '@/app/ui/xenocats/random';

describe('createRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const first = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(first);
  });

  it('gives a different sequence for a different seed', () => {
    expect(createRandom(1).next()).not.toBe(createRandom(2).next());
  });

  it('stays inside its ranges', () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i++) {
      const n = random.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      const r = random.range(-5, 5);
      expect(r).toBeGreaterThanOrEqual(-5);
      expect(r).toBeLessThan(5);
      const k = random.int(1, 3);
      expect([1, 2, 3]).toContain(k);
    }
  });

  it('int reaches both ends', () => {
    const random = createRandom(3);
    const seen = new Set(Array.from({ length: 200 }, () => random.int(1, 3)));
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it('pick returns an item and refuses an empty list', () => {
    const random = createRandom(9);
    expect(['a', 'b']).toContain(random.pick(['a', 'b']));
    expect(() => random.pick([])).toThrow();
  });
});

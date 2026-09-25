// The one source of randomness for the cats: seedable, so tests are deterministic.

export interface Random {
  /** A float in [0, 1). */
  next(): number;
  /** A float in [min, max). */
  range(min: number, max: number): number;
  /** An integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** A seed for when nobody chose one (the live page). Tests always pass their own. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0;
}

/** Mulberry32: small, fast and good enough for animation. Not for anything secret. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error('Cannot pick from an empty list.');
      return items[Math.floor(next() * items.length)];
    },
  };
}

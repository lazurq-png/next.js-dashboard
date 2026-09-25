import { describe, expect, it } from 'vitest';
import { CAT_TYPES, catTypeById } from '@/app/ui/xenocats/cat-types';
import { MAX_EFFECT_MS } from '@/app/ui/xenocats/effects';

describe('the cat roster', () => {
  it('has unique ids and roster numbers', () => {
    expect(new Set(CAT_TYPES.map((type) => type.id)).size).toBe(CAT_TYPES.length);
    expect(new Set(CAT_TYPES.map((type) => type.number)).size).toBe(CAT_TYPES.length);
  });

  it('gives every cat an effect, an entrance and an exit that fit the engine', () => {
    for (const type of CAT_TYPES) {
      expect(type.effect.durationMs).toBeGreaterThan(0);
      expect(type.effect.durationMs).toBeLessThanOrEqual(MAX_EFFECT_MS);
      expect(type.entrance).toMatch(/^[a-z-]+$/);
      expect(type.exit).toMatch(/^[a-z-]+$/);
      expect(type.entranceMs).toBeGreaterThan(0);
      expect(type.exitMs).toBeGreaterThan(0);
    }
  });

  it('starts with the plan’s first three cats and their effects', () => {
    expect(CAT_TYPES.slice(0, 3).map((type) => [type.number, type.name, type.effect.id])).toEqual([
      [1, 'Void Tabby', 'vanish'],
      [2, 'Gravi Coon', 'heavy'],
      [3, 'Pulsar Siamese', 'knockback'],
    ]);
  });

  it('looks cats up by id', () => {
    expect(catTypeById('gravi-coon')?.name).toBe('Gravi Coon');
    expect(catTypeById('dog')).toBeUndefined();
  });
});

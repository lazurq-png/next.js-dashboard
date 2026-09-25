import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAT_TYPES, catTypeById } from '@/app/ui/xenocats/cat-types';
import { MAX_EFFECT_MS } from '@/app/ui/xenocats/effects';

const css = readFileSync(new URL('../../../app/ui/global.css', import.meta.url), 'utf8');

describe('the cat roster', () => {
  it('has unique ids and roster numbers', () => {
    expect(new Set(CAT_TYPES.map((type) => type.id)).size).toBe(CAT_TYPES.length);
    expect(new Set(CAT_TYPES.map((type) => type.number)).size).toBe(CAT_TYPES.length);
  });

  it('gives every cat an effect, an entrance and an exit that fit the engine', () => {
    for (const type of CAT_TYPES) {
      expect(type.effect.durationMs).toBeGreaterThan(0);
      expect(type.effect.durationMs).toBeLessThanOrEqual(MAX_EFFECT_MS);
      expect(type.entranceMs).toBeGreaterThan(0);
      expect(type.exitMs).toBeGreaterThan(0);
    }
  });

  it('follows the plan’s roster for cats 1–7', () => {
    expect(CAT_TYPES.slice(0, 7).map((type) => [type.number, type.name, type.effect.id])).toEqual([
      [1, 'Void Tabby', 'vanish'],
      [2, 'Gravi Coon', 'heavy'],
      [3, 'Pulsar Siamese', 'knockback'],
      [4, 'Mirror Sphynx', 'reverse'],
      [5, 'Static Calico', 'jitter'],
      [6, 'Cryo Persian', 'freeze'],
      [7, 'Nebula Ragdoll', 'drift'],
    ]);
  });

  it('gives every cat its own attack, look, entrance and exit', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(CAT_TYPES.map((type) => type.effect.id))).toBe(true);
    expect(unique(CAT_TYPES.map((type) => JSON.stringify(type.look)))).toBe(true);
    expect(unique(CAT_TYPES.map((type) => type.entrance))).toBe(true);
    expect(unique(CAT_TYPES.map((type) => type.exit))).toBe(true);
  });

  it.each(CAT_TYPES.map((type) => [type.name, type] as const))(
    '%s’s entrance and exit exist as animations in global.css',
    (_name, type) => {
      for (const name of [`xenocat-enter-${type.entrance}`, `xenocat-exit-${type.exit}`]) {
        expect(css).toContain(`.${name} {`);
        expect(css).toContain(`@keyframes ${name} {`);
      }
    }
  );

  it('looks cats up by id', () => {
    expect(catTypeById('gravi-coon')?.name).toBe('Gravi Coon');
    expect(catTypeById('dog')).toBeUndefined();
  });
});

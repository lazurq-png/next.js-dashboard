// The roster: each cat type pairs an attack effect with its look and its ways of
// arriving and leaving. Entrances and exits name CSS animations in global.css
// (`xenocat-enter-<name>` / `xenocat-exit-<name>`).

import { type Effect, heavy, knockback, vanish } from './effects';

export type CatPalette = {
  /** Fur. */
  body: string;
  /** Belly, inner ears and muzzle. */
  belly: string;
  /** Eyes and the antenna's glowing tip. */
  glow: string;
  /** Stripes, spots and outline accents. */
  accent: string;
};

export type CatType = {
  id: string;
  /** Its number in the plan's roster, 1–20. */
  number: number;
  name: string;
  effect: Effect;
  palette: CatPalette;
  /** How it arrives: `xenocat-enter-<entrance>`. */
  entrance: string;
  entranceMs: number;
  /** How it leaves: `xenocat-exit-<exit>`. */
  exit: string;
  exitMs: number;
};

export const CAT_TYPES: readonly CatType[] = [
  {
    id: 'void-tabby',
    number: 1,
    name: 'Void Tabby',
    effect: vanish,
    palette: { body: '#3b3552', belly: '#6d6590', glow: '#a78bfa', accent: '#1e1b2e' },
    entrance: 'fade',
    entranceMs: 800,
    exit: 'fade',
    exitMs: 600,
  },
  {
    id: 'gravi-coon',
    number: 2,
    name: 'Gravi Coon',
    effect: heavy,
    palette: { body: '#8a6d4b', belly: '#d9c2a0', glow: '#fbbf24', accent: '#4a3826' },
    entrance: 'fade',
    entranceMs: 800,
    exit: 'fade',
    exitMs: 600,
  },
  {
    id: 'pulsar-siamese',
    number: 3,
    name: 'Pulsar Siamese',
    effect: knockback,
    palette: { body: '#efe6d8', belly: '#fffaf2', glow: '#38bdf8', accent: '#5b4636' },
    entrance: 'fade',
    entranceMs: 800,
    exit: 'fade',
    exitMs: 600,
  },
];

export function catTypeById(id: string): CatType | undefined {
  return CAT_TYPES.find((type) => type.id === id);
}

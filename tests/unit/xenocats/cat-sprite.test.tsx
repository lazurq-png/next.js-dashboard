// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { CatSprite } from '@/app/ui/xenocats/cat-sprite';
import { CAT_TYPES } from '@/app/ui/xenocats/cat-types';

afterEach(() => cleanup());

describe('CatSprite', () => {
  it.each(CAT_TYPES.map((type) => [type.name, type] as const))(
    'draws %s awake and asleep, with its eyes and antenna glowing',
    (_name, type) => {
      for (const pose of ['awake', 'asleep'] as const) {
        const { container } = render(
          <CatSprite palette={type.palette} look={type.look} pose={pose} />
        );
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('viewBox')).toBe('0 0 72 72');
        expect(svg.querySelector('.xenocat-body')).not.toBeNull();
        if (pose === 'awake')
          expect(svg.querySelectorAll('.xenocat-glow').length).toBeGreaterThan(1);
        cleanup();
      }
    }
  );

  it('draws every cat differently, awake and asleep', () => {
    for (const pose of ['awake', 'asleep'] as const) {
      const drawings = CAT_TYPES.map((type) =>
        renderToStaticMarkup(<CatSprite palette={type.palette} look={type.look} pose={pose} />)
      );
      expect(new Set(drawings).size).toBe(CAT_TYPES.length);
    }
  });

  it('sleeping looks different from awake', () => {
    const type = CAT_TYPES[0];
    const awake = renderToStaticMarkup(
      <CatSprite palette={type.palette} look={type.look} pose="awake" />
    );
    const asleep = renderToStaticMarkup(
      <CatSprite palette={type.palette} look={type.look} pose="asleep" />
    );
    expect(asleep).not.toBe(awake);
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Xenocats, XenocatCatsProvider, useXenocats } from '@/app/ui/xenocats/cat-layer';
import { XenocatCursorProvider } from '@/app/ui/xenocats/fake-cursor';

let clock = 0;
let cats: Xenocats;

function Capture() {
  const current = useXenocats();
  useEffect(() => {
    cats = current;
  }, [current]);
  return null;
}

function renderCats() {
  render(
    <XenocatCursorProvider now={() => clock} seed={7}>
      <XenocatCatsProvider autoSpawn={false}>
        <Capture />
        <p>Invoices</p>
      </XenocatCatsProvider>
    </XenocatCursorProvider>
  );
}

beforeEach(() => {
  clock = 0;
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => cleanup());

describe('XenocatCatsProvider', () => {
  it('draws a summoned cat, hidden from assistive technology', () => {
    renderCats();
    act(() => {
      expect(cats.summon('void-tabby')).toBe(true);
    });
    const cat = screen.getByTestId('xenocat');
    expect(cat.dataset.catType).toBe('void-tabby');
    expect(cat.dataset.phase).toBe('appearing');
    expect(screen.getByTestId('xenocat-layer').getAttribute('aria-hidden')).toBe('true');
  });

  it('never shows more than five cats', () => {
    renderCats();
    act(() => {
      for (let i = 0; i < 5; i++) expect(cats.summon('gravi-coon')).toBe(true);
      expect(cats.summon('gravi-coon')).toBe(false);
    });
    expect(screen.getAllByTestId('xenocat')).toHaveLength(5);
  });

  it('refuses an unknown type', () => {
    renderCats();
    act(() => {
      expect(cats.summon('dog')).toBe(false);
    });
    expect(screen.queryByTestId('xenocat')).toBeNull();
  });

  it('a summoned cat attacks the cursor with its effect once it has arrived', async () => {
    renderCats();
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    act(() => {
      cats.summon('void-tabby');
    });
    clock = 1000; // past the 800 ms entrance
    const fake = screen.getByTestId('fake-cursor');
    await waitFor(() => expect(fake.dataset.effect).toBe('vanish'));
    expect(screen.getByTestId('xenocat').dataset.phase).toBe('attacking');
  });

  it('with the real cursor, only one of two ready cats attacks at a time', async () => {
    renderCats();
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    act(() => {
      cats.summon('void-tabby');
      cats.summon('gravi-coon');
    });
    clock = 1000; // both have arrived and want to attack
    const phases = () => screen.getAllByTestId('xenocat').map((cat) => cat.dataset.phase);
    await waitFor(() => expect(phases().sort()).toEqual(['attacking', 'ready']));
    // Once the first cat's effect is over, the waiting one gets its turn.
    clock = 1000 + 3000 + 700;
    await waitFor(() => expect(screen.getByTestId('fake-cursor').dataset.effect).not.toBe(''));
    await waitFor(() => expect(phases()).toContain('attacking'));
    expect(phases()).not.toContain('ready');
  });

  it('a ready cat waits while the pointer is off the page', async () => {
    renderCats();
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    fireEvent.pointerOut(document.body, { relatedTarget: null });
    act(() => {
      cats.summon('void-tabby');
    });
    clock = 1000;
    await waitFor(() => expect(screen.getByTestId('xenocat').dataset.phase).toBe('ready'));
    expect(screen.getByTestId('fake-cursor').dataset.effect).toBe('');
    // The pointer comes back: now it pounces.
    fireEvent.pointerMove(window, { clientX: 6, clientY: 5 });
    await waitFor(() => expect(screen.getByTestId('xenocat').dataset.phase).toBe('attacking'));
  });

  it('a sleeping cat shows its z’s', async () => {
    render(
      <XenocatCursorProvider now={() => clock} seed={7}>
        <XenocatCatsProvider config={{ firstSpawnMs: [0, 1] }}>
          <p>Invoices</p>
        </XenocatCatsProvider>
      </XenocatCursorProvider>
    );
    // The first spawn is scheduled up to 1 ms after the first tick: keep time moving.
    await waitFor(() => {
      clock += 5;
      expect(screen.getByTestId('xenocat')).toBeTruthy();
    });
    clock = 1000; // arrived; now asleep
    await waitFor(() => expect(screen.getByTestId('xenocat').dataset.phase).toBe('sleeping'));
    expect(screen.getAllByText(/^z$/i).length).toBe(3);
  });
});

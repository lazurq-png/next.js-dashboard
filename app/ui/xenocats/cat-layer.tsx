'use client';

import { type CSSProperties, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { type Cat, type CatEngine, createCatEngine } from './cat-engine';
import { CatSprite } from './cat-sprite';
import { CAT_TYPES, type CatType } from './cat-types';
import type { CatConfig } from './config';
import { useXenocatCursor } from './fake-cursor';

export type Xenocats = {
  /** Brings a cat of this type on screen to attack at once. False if 5 are already there. */
  summon(typeId: string): boolean;
};

const CatsContext = createContext<Xenocats | null>(null);

export function useXenocats(): Xenocats {
  const cats = useContext(CatsContext);
  if (!cats) throw new Error('useXenocats must be used inside <XenocatCatsProvider>.');
  return cats;
}

const snapshot = (engine: CatEngine) => engine.cats().map((cat) => ({ ...cat }));

/**
 * Runs the cats over whatever it wraps. Must sit inside <XenocatCursorProvider>,
 * whose clock, random source and cursor it shares.
 */
export function XenocatCatsProvider({
  children,
  autoSpawn = true,
  types = CAT_TYPES,
  config,
}: {
  children: React.ReactNode;
  /** False where cats only come when summoned. */
  autoSpawn?: boolean;
  types?: readonly CatType[];
  config?: Partial<CatConfig>;
}) {
  const cursor = useXenocatCursor();
  const [engine] = useState(() =>
    createCatEngine({
      random: cursor.random,
      types,
      viewport: { width: 0, height: 0 },
      autoSpawn,
      config,
    })
  );
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    const onResize = () => engine.resize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);

    let frameId = 0;
    const tick = () => {
      const changed = engine.tick(cursor.now(), cursor.position(), (_cat, type, centre) => {
        // No cursor at all (a touch screen, or the pointer not seen yet): the cat
        // pounces at nothing and leaves, rather than waiting on screen for ever.
        if (cursor.position() === null) return true;
        // The pointer is off the page: wait, rather than block clicks with an effect
        // nobody sees.
        if (!cursor.isPresent()) return false;
        return cursor.attack(type.effect, centre);
      });
      if (changed) setCats(snapshot(engine));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
    };
  }, [engine, cursor]);

  const api = useMemo<Xenocats>(
    () => ({
      summon: (typeId) => {
        const cat = engine.summon(typeId, cursor.now(), cursor.position());
        if (cat) setCats(snapshot(engine));
        return cat !== null;
      },
    }),
    [engine, cursor]
  );

  return (
    <CatsContext.Provider value={api}>
      {children}
      <div
        aria-hidden="true"
        data-testid="xenocat-layer"
        className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
      >
        {cats.map((cat) => {
          const type = types.find((t) => t.id === cat.typeId);
          return type ? (
            <CatView key={cat.id} cat={cat} type={type} config={engine.config} />
          ) : null;
        })}
      </div>
    </CatsContext.Provider>
  );
}

function CatView({ cat, type, config }: { cat: Cat; type: CatType; config: CatConfig }) {
  const size = config.catSize;
  // The arrival and departure animate the whole cat; the phases in between animate
  // the inner figure, so the two never fight over one `transform`.
  const outer =
    cat.phase === 'appearing'
      ? { className: `xenocat-enter-${type.entrance}`, ms: type.entranceMs }
      : cat.phase === 'leaving'
        ? { className: `xenocat-exit-${type.exit}`, ms: type.exitMs }
        : null;
  const style: CSSProperties = {
    left: cat.x,
    top: cat.y,
    width: size,
    height: size,
    animationDuration: outer ? `${outer.ms}ms` : undefined,
  };
  const asleep = cat.phase === 'sleeping';
  // The one-shot phase animations last exactly as long as their phase (config.ts).
  const innerMs =
    cat.phase === 'waking' ? config.wakeMs : cat.phase === 'attacking' ? config.attackMs : null;

  return (
    <div
      data-testid="xenocat"
      data-cat-type={type.id}
      data-phase={cat.phase}
      className={`absolute ${outer?.className ?? ''}`}
      style={style}
    >
      <div
        className={`xenocat-${cat.phase} h-full w-full`}
        style={innerMs === null ? undefined : { animationDuration: `${innerMs}ms` }}
      >
        <CatSprite palette={type.palette} pose={asleep ? 'asleep' : 'awake'} size={size} />
      </div>
      {asleep && (
        <div className="absolute -top-1 right-1" style={{ color: type.palette.glow }}>
          <span className="xenocat-z">z</span>
          <span className="xenocat-z" style={{ animationDelay: '0.8s' }}>
            z
          </span>
          <span className="xenocat-z" style={{ animationDelay: '1.6s' }}>
            Z
          </span>
        </div>
      )}
    </div>
  );
}

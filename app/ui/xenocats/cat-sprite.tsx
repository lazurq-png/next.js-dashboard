import type { CatPalette } from './cat-types';

// A 72×72 alien cat in two poses. `.xenocat-body` is what breathes while asleep;
// `.xenocat-glow` is the antenna tip and eyes, which pulse.

export function CatSprite({
  palette,
  pose,
  size = 72,
}: {
  palette: CatPalette;
  pose: 'awake' | 'asleep';
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className="overflow-visible">
      {pose === 'asleep' ? <Asleep palette={palette} /> : <Awake palette={palette} />}
    </svg>
  );
}

function Awake({ palette: p }: { palette: CatPalette }) {
  return (
    <g className="xenocat-body">
      {/* tail */}
      <path
        d="M54 54 C66 50 66 36 60 30"
        fill="none"
        stroke={p.body}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M60 30 l-1.5 -4 l4 2 z" fill={p.accent} />
      {/* body and belly */}
      <ellipse cx="36" cy="51" rx="19" ry="14" fill={p.body} />
      <ellipse cx="36" cy="55" rx="10" ry="8" fill={p.belly} />
      <path d="M22 46 q3 -3 6 0 M44 46 q3 -3 6 0" stroke={p.accent} strokeWidth="1.6" fill="none" />
      {/* paws */}
      <ellipse cx="27" cy="64" rx="5" ry="3" fill={p.body} stroke={p.accent} strokeWidth="0.8" />
      <ellipse cx="45" cy="64" rx="5" ry="3" fill={p.body} stroke={p.accent} strokeWidth="0.8" />
      {/* antenna */}
      <path d="M36 16 Q34 9 38 4" fill="none" stroke={p.accent} strokeWidth="1.6" />
      <circle className="xenocat-glow" cx="38" cy="4" r="3" fill={p.glow} />
      {/* ears */}
      <path d="M22 24 L24 8 L33 18 Z" fill={p.body} />
      <path d="M50 24 L48 8 L39 18 Z" fill={p.body} />
      <path d="M24.5 20 L25.5 12 L30 17 Z" fill={p.belly} />
      <path d="M47.5 20 L46.5 12 L42 17 Z" fill={p.belly} />
      {/* head */}
      <circle cx="36" cy="30" r="15" fill={p.body} />
      <path d="M30 17 q6 4 12 0" stroke={p.accent} strokeWidth="1.6" fill="none" />
      <ellipse cx="36" cy="36" rx="7" ry="5" fill={p.belly} />
      {/* eyes */}
      <ellipse className="xenocat-glow" cx="30" cy="29" rx="4.6" ry="5.6" fill={p.glow} />
      <ellipse className="xenocat-glow" cx="42" cy="29" rx="4.6" ry="5.6" fill={p.glow} />
      <ellipse cx="30" cy="29" rx="1.3" ry="4.2" fill={p.accent} />
      <ellipse cx="42" cy="29" rx="1.3" ry="4.2" fill={p.accent} />
      <circle cx="31.4" cy="26.8" r="1.1" fill="#ffffff" />
      <circle cx="43.4" cy="26.8" r="1.1" fill="#ffffff" />
      {/* nose, mouth, whiskers */}
      <path d="M34.6 34.4 h2.8 l-1.4 1.8 z" fill={p.accent} />
      <path
        d="M36 36.2 q-1.6 2 -3.2 0.8 M36 36.2 q1.6 2 3.2 0.8"
        stroke={p.accent}
        strokeWidth="0.9"
        fill="none"
      />
      <path
        d="M26 35 l-7 -1.5 M26 37 l-7 1 M46 35 l7 -1.5 M46 37 l7 1"
        stroke={p.accent}
        strokeWidth="0.7"
        opacity="0.7"
      />
    </g>
  );
}

function Asleep({ palette: p }: { palette: CatPalette }) {
  return (
    <g className="xenocat-body">
      {/* curled body */}
      <ellipse cx="38" cy="52" rx="26" ry="14" fill={p.body} />
      <path
        d="M22 44 q4 -4 8 0 M34 41 q4 -4 8 0 M46 43 q4 -4 8 0"
        stroke={p.accent}
        strokeWidth="1.6"
        fill="none"
      />
      {/* tail wrapped round the front */}
      <path
        d="M62 54 C62 66 34 68 22 62"
        fill="none"
        stroke={p.body}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M22 62 l-3 -3 l4 -1 z" fill={p.accent} />
      {/* head resting on the paws */}
      <path d="M13 44 L14 31 L21 38 Z" fill={p.body} />
      <path d="M33 42 L31 30 L25 37 Z" fill={p.body} />
      <circle cx="23" cy="47" r="12" fill={p.body} />
      <ellipse cx="23" cy="51" rx="6" ry="4" fill={p.belly} />
      {/* drooping antenna, dimmed */}
      <path d="M23 35 Q27 28 33 30" fill="none" stroke={p.accent} strokeWidth="1.5" />
      <circle cx="33" cy="30" r="2.4" fill={p.glow} opacity="0.45" />
      {/* closed eyes */}
      <path
        d="M16.5 46 q2.5 2 5 0 M24.5 46 q2.5 2 5 0"
        stroke={p.accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M21.8 49.6 h2.4 l-1.2 1.4 z" fill={p.accent} />
    </g>
  );
}

import type { ArtKey, BrandKey } from "@/data/catalog";

/**
 * Барааны зургийг орлох вектор дүрслэл.
 *
 * Production дээр эдгээрийг S3 дээрх бодит барааны зургаар (next/image)
 * солино. MVP-д гадаад asset-гүйгээр каталог бүрэн харагдах зорилготой.
 */

const frame = {
  viewBox: "0 0 200 150",
  preserveAspectRatio: "xMidYMid meet",
  className: "h-full w-full",
} as const;

const CementBag = ({
  brand = "МОНЦЕМЕНТ",
  sub = "ПОРТЛАНД ЦЕМЕНТ",
  accent = "#1b4f9c",
  weight = "50 кг",
}: {
  brand?: string;
  sub?: string;
  accent?: string;
  weight?: string;
}) => (
  <svg {...frame} role="img" aria-label={`${brand} цементийн уут`}>
    <defs>
      <linearGradient id={`bag-${accent}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f3e7d3" />
        <stop offset="55%" stopColor="#e6d5b8" />
        <stop offset="100%" stopColor="#cdb992" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="136" rx="52" ry="7" fill="#000" opacity="0.35" />
    <path
      d="M63 26c0-3 2-5 5-5h64c3 0 5 2 5 5l4 100c0 4-3 7-7 7H66c-4 0-7-3-7-7z"
      fill={`url(#bag-${accent})`}
    />
    <path d="M63 26h74l1 9H62z" fill="#d9c6a3" />
    <path d="M62 35h76v2H62z" fill="#b9a586" opacity="0.7" />
    <rect x="68" y="44" width="64" height="26" rx="2" fill={accent} />
    <path d="M72 58l6-9 4 5.5 3.5-4.5 6 8z" fill="#fff" opacity="0.95" />
    <text
      x="104"
      y="61"
      textAnchor="middle"
      fontSize="8"
      fontWeight="700"
      fill="#fff"
      fontFamily="system-ui, sans-serif"
      letterSpacing="0.3"
    >
      {brand}
    </text>
    <text
      x="100"
      y="82"
      textAnchor="middle"
      fontSize="7.5"
      fontWeight="600"
      fill="#4a3f2c"
      fontFamily="system-ui, sans-serif"
    >
      {sub}
    </text>
    <text
      x="100"
      y="93"
      textAnchor="middle"
      fontSize="5.5"
      fill="#6b5c42"
      fontFamily="system-ui, sans-serif"
    >
      MNS 974:2008
    </text>
    <rect x="76" y="102" width="48" height="18" rx="3" fill="#2b2b2b" />
    <text
      x="100"
      y="115"
      textAnchor="middle"
      fontSize="11"
      fontWeight="700"
      fill="#fff"
      fontFamily="system-ui, sans-serif"
    >
      {weight}
    </text>
  </svg>
);

const Bricks = () => (
  <svg {...frame} role="img" aria-label="Улаан тоосго">
    <defs>
      <linearGradient id="brick-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0713c" />
        <stop offset="100%" stopColor="#b4471f" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="132" rx="66" ry="8" fill="#000" opacity="0.35" />
    {[
      { x: 34, y: 92 },
      { x: 104, y: 92 },
      { x: 69, y: 64 },
      { x: 34, y: 36 },
      { x: 104, y: 36 },
    ].map((b, i) => (
      <g key={i}>
        <rect
          x={b.x}
          y={b.y}
          width="62"
          height="26"
          rx="3"
          fill="url(#brick-g)"
        />
        <path
          d={`M${b.x} ${b.y + 3}h62`}
          stroke="#f0a077"
          strokeWidth="2.5"
          opacity="0.55"
        />
        <rect
          x={b.x}
          y={b.y}
          width="62"
          height="26"
          rx="3"
          fill="none"
          stroke="#8e3315"
          strokeWidth="1"
        />
      </g>
    ))}
  </svg>
);

const AeratedBlocks = () => (
  <svg {...frame} role="img" aria-label="Хийт блок">
    <defs>
      <linearGradient id="ac-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e9ecef" />
        <stop offset="100%" stopColor="#c3c8ce" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="126" rx="64" ry="8" fill="#000" opacity="0.35" />
    <g>
      <path d="M22 66l30-16h74l-30 16z" fill="#f4f6f8" />
      <path d="M22 66h74v48H22z" fill="url(#ac-face)" />
      <path d="M96 66l30-16v48l-30 16z" fill="#aab1b9" />
    </g>
    <g>
      <path d="M84 92l30-16h64l-30 16z" fill="#f4f6f8" />
      <path d="M84 92h64v30H84z" fill="url(#ac-face)" />
      <path d="M148 92l30-16v30l-30 16z" fill="#aab1b9" />
    </g>
  </svg>
);

const Rebar = () => (
  <svg {...frame} role="img" aria-label="Арматур төмөр">
    <defs>
      <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9aa3ad" />
        <stop offset="45%" stopColor="#5c646e" />
        <stop offset="100%" stopColor="#3a4048" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="128" rx="70" ry="8" fill="#000" opacity="0.35" />
    {[0, 1, 2, 3, 4].map((i) => {
      const y = 30 + i * 19;
      return (
        <g key={i}>
          <rect
            x="16"
            y={y}
            width="168"
            height="14"
            rx="7"
            fill="url(#steel)"
          />
          {Array.from({ length: 14 }).map((_, k) => (
            <path
              key={k}
              d={`M${26 + k * 12} ${y + 1.5} l6 11`}
              stroke="#2c3138"
              strokeWidth="2"
              opacity="0.55"
              strokeLinecap="round"
            />
          ))}
          <path
            d={`M20 ${y + 4}h160`}
            stroke="#c9d1da"
            strokeWidth="1.6"
            opacity="0.4"
            strokeLinecap="round"
          />
        </g>
      );
    })}
  </svg>
);

const Insulation = () => (
  <svg {...frame} role="img" aria-label="Чулуун хөвөн дулаалга">
    <defs>
      <linearGradient id="wool" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#c9a03a" />
        <stop offset="35%" stopColor="#f2d475" />
        <stop offset="100%" stopColor="#b98f2e" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="130" rx="62" ry="8" fill="#000" opacity="0.35" />
    {[
      { x: 40, w: 46 },
      { x: 100, w: 46 },
    ].map((r, i) => (
      <g key={i}>
        <rect x={r.x} y="30" width={r.w} height="96" rx="6" fill="url(#wool)" />
        <ellipse cx={r.x + r.w / 2} cy="30" rx={r.w / 2} ry="8" fill="#f7e6a8" />
        <rect x={r.x} y="58" width={r.w} height="34" fill="#f6f7f9" />
        <text
          x={r.x + r.w / 2}
          y="79"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#2f6fb8"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          ISOVER
        </text>
        <rect x={r.x} y="58" width={r.w} height="34" fill="none" stroke="#d8c78d" strokeWidth="1" />
      </g>
    ))}
  </svg>
);

const Plywood = () => (
  <svg {...frame} role="img" aria-label="Фанер хавтан">
    <defs>
      <linearGradient id="ply-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8c391" />
        <stop offset="100%" stopColor="#c99a62" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="128" rx="68" ry="8" fill="#000" opacity="0.35" />
    {[0, 1, 2, 3].map((i) => {
      const y = 96 - i * 15;
      return (
        <g key={i}>
          <path
            d={`M28 ${y} 100 ${y - 20} 172 ${y} 100 ${y + 20}z`}
            fill="url(#ply-top)"
          />
          <path
            d={`M28 ${y} 100 ${y + 20} 100 ${y + 26} 28 ${y + 6}z`}
            fill="#a97c46"
          />
          <path
            d={`M172 ${y} 100 ${y + 20} 100 ${y + 26} 172 ${y + 6}z`}
            fill="#8c6538"
          />
          {i === 3 &&
            [0, 1, 2].map((k) => (
              <path
                key={k}
                d={`M${58 + k * 26} ${y - 8 + k * 3} 118 ${y + 4 + k * 2}`}
                stroke="#b98a53"
                strokeWidth="1.4"
                opacity="0.7"
              />
            ))}
        </g>
      );
    })}
  </svg>
);

const ART: Record<ArtKey, () => React.JSX.Element> = {
  cement: () => <CementBag />,
  brick: Bricks,
  "aerated-block": AeratedBlocks,
  rebar: Rebar,
  insulation: Insulation,
  plywood: Plywood,
};

export function ProductArt({ art }: { art: ArtKey }) {
  const Component = ART[art];
  return <Component />;
}

const BRAND_ART: Record<BrandKey, React.JSX.Element> = {
  montsement: <CementBag brand="МОНЦЕМЕНТ" accent="#1b4f9c" />,
  khass: <CementBag brand="ХАСС" accent="#1f6fd0" sub="ПОРТЛАНД ЦЕМЕНТ" />,
  mak: <CementBag brand="МАК" accent="#a3231f" sub="ПОРТЛАНД ЦЕМЕНТ" />,
  senko: <CementBag brand="СЕНКО" accent="#1c74a8" sub="ПОРТЛАНД ЦЕМЕНТ" />,
};

export function BrandArt({ brand }: { brand: BrandKey }) {
  return BRAND_ART[brand];
}

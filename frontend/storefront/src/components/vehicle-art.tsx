"use client";

import { useEffect, useState } from "react";

/**
 * Хүргэлтийн машины дүрслэл.
 *
 * Худалдан авагч «ямар машин ирэх вэ» гэдгээ нүдээр шалгадаг — хашааны
 * хаалганд багтах уу, кран хэрэгтэй юү. Тиймээс даацын ангилал бүрийг
 * биетээр нь ялгаж, харьцаа нь бодитоор мэдрэгдэхээр зурав: бүх машиныг
 * нэг `viewBox`-д, ижил масштабаар байрлуулсан тул Портер ба чиргүүлийн
 * урт нь харьцангуйгаар зөв харагдана.
 *
 * Бодит гэрэл зураг байвал түүнийг харуулна: `public/vehicles/<id>.jpg`
 * (`common/logistics`-ийн `VEHICLES` дэх id — porter, truck-3, truck-5,
 * truck-10, truck-20). Файл байхгүй бол доорх вектор дүрслэл рүү шилжинэ
 * — ингэснээр зургаа нэмэхэд код өөрчлөх шаардлагагүй.
 */

const frame = {
  viewBox: "0 0 240 108",
  preserveAspectRatio: "xMidYMid meet",
  className: "h-full w-full",
} as const;

const CAB = "#e8933c";
const CAB_HI = "#f5b063";
const CAB_LO = "#b96f27";
const BOX = "#dde4ec";
const BOX_HI = "#f4f7fa";
const BOX_LO = "#aab4c2";
const GLASS = "#6f9ec4";
const GLASS_HI = "#a8c8e0";
const TYRE = "#1c1f24";
const RIM = "#9aa3ae";
const CHASSIS = "#4a525d";

/** Дугуй — арал, хонгил, сүүдэртэй */
const Wheel = ({ cx, cy = 84, r = 12 }: { cx: number; cy?: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={TYRE} />
    <circle cx={cx} cy={cy} r={r * 0.55} fill={RIM} />
    <circle cx={cx} cy={cy} r={r * 0.2} fill="#5d646e" />
  </g>
);

/** Дугуйн хонгил — их биен дээр таслагдсан нум */
const Arch = ({ cx, r = 15 }: { cx: number; r?: number }) => (
  <path
    d={`M${cx - r} 84a${r} ${r} 0 0 1 ${r * 2} 0`}
    fill="none"
    stroke={CHASSIS}
    strokeWidth="2.5"
  />
);

const Shadow = () => (
  <ellipse cx="120" cy="97" rx="104" ry="5.5" fill="#000" opacity="0.28" />
);

/** Гэрэл, толь, гулзайлт зэрэг кабины нийтлэг нарийн ширийн */
const CabDetails = ({ x, w, top }: { x: number; w: number; top: number }) => (
  <g>
    {/* Толь */}
    <path
      d={`M${x - 2} ${top + 6}h-5v9h5`}
      fill="none"
      stroke={CAB_LO}
      strokeWidth="2"
    />
    {/* Урд гэрэл */}
    <rect x={x - 1} y={72} width="6" height="5" rx="1.5" fill="#ffe08a" />
    {/* Хаалганы шугам */}
    <path d={`M${x + w * 0.62} ${top + 4}v${84 - top - 8}`} stroke={CAB_LO} strokeWidth="1.5" />
    {/* Бариул */}
    <rect x={x + w * 0.44} y={top + 22} width="7" height="2.5" rx="1.2" fill={CAB_LO} />
  </g>
);

/** Портер — задгай тэвштэй, хамгийн богино */
const Porter = () => (
  <svg {...frame} role="img" aria-label="Портер машин">
    <defs>
      <linearGradient id="v-porter-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CAB_HI} />
        <stop offset="70%" stopColor={CAB} />
        <stop offset="100%" stopColor={CAB_LO} />
      </linearGradient>
      <linearGradient id="v-porter-bed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOX_HI} />
        <stop offset="100%" stopColor={BOX_LO} />
      </linearGradient>
    </defs>
    <Shadow />
    {/* Тэвш — хажуу тал нам */}
    <path d="M124 56h58v28h-58z" fill="url(#v-porter-bed)" />
    <path d="M124 56h58v4h-58z" fill={BOX_LO} />
    <path d="M138 60v20M156 60v20M170 60v20" stroke={BOX_LO} strokeWidth="1.5" />
    {/* Кабин */}
    <path d="M62 40h62v44H62z" fill="url(#v-porter-cab)" />
    <path d="M70 46h34v16H70z" fill={GLASS} />
    <path d="M70 46h34l-10 16H70z" fill={GLASS_HI} opacity="0.55" />
    <CabDetails x={62} w={62} top={40} />
    {/* Хөл, бампер */}
    <path d="M60 84h124v6H60z" fill={CHASSIS} />
    <path d="M58 76h6v10h-6z" fill={CHASSIS} />
    <Arch cx={86} r={16} />
    <Arch cx={162} r={16} />
    <Wheel cx={86} r={13} />
    <Wheel cx={162} r={13} />
  </svg>
);

/** 3 тонн — битүү фургон */
const Truck3 = () => (
  <svg {...frame} role="img" aria-label="3 тонны ачааны машин">
    <defs>
      <linearGradient id="v-t3-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CAB_HI} />
        <stop offset="70%" stopColor={CAB} />
        <stop offset="100%" stopColor={CAB_LO} />
      </linearGradient>
      <linearGradient id="v-t3-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOX_HI} />
        <stop offset="55%" stopColor={BOX} />
        <stop offset="100%" stopColor={BOX_LO} />
      </linearGradient>
    </defs>
    <Shadow />
    <path d="M112 34h84v50h-84z" fill="url(#v-t3-box)" />
    <path d="M112 34h84v6h-84z" fill={BOX_LO} />
    <path d="M120 44h68v34h-68z" fill="#fff" opacity="0.45" />
    <path d="M154 44v34" stroke={BOX_LO} strokeWidth="2" />
    <path d="M54 42h58v42H54z" fill="url(#v-t3-cab)" />
    <path d="M62 48h32v16H62z" fill={GLASS} />
    <path d="M62 48h32l-10 16H62z" fill={GLASS_HI} opacity="0.55" />
    <CabDetails x={54} w={58} top={42} />
    <path d="M52 84h146v6H52z" fill={CHASSIS} />
    <path d="M50 76h6v10h-6z" fill={CHASSIS} />
    <Arch cx={78} r={15} />
    <Arch cx={166} r={15} />
    <Wheel cx={78} r={12.5} />
    <Wheel cx={166} r={12.5} />
  </svg>
);

/** 5 тонн — урт фургон, ард хос дугуйтай */
const Truck5 = () => (
  <svg {...frame} role="img" aria-label="5 тонны ачааны машин">
    <defs>
      <linearGradient id="v-t5-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CAB_HI} />
        <stop offset="70%" stopColor={CAB} />
        <stop offset="100%" stopColor={CAB_LO} />
      </linearGradient>
      <linearGradient id="v-t5-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOX_HI} />
        <stop offset="55%" stopColor={BOX} />
        <stop offset="100%" stopColor={BOX_LO} />
      </linearGradient>
    </defs>
    <Shadow />
    <path d="M104 26h114v58H104z" fill="url(#v-t5-box)" />
    <path d="M104 26h114v7H104z" fill={BOX_LO} />
    <path d="M112 38h98v40h-98z" fill="#fff" opacity="0.45" />
    <path d="M145 38v40M178 38v40" stroke={BOX_LO} strokeWidth="2" />
    <path d="M44 38h60v46H44z" fill="url(#v-t5-cab)" />
    <path d="M52 44h34v18H52z" fill={GLASS} />
    <path d="M52 44h34l-11 18H52z" fill={GLASS_HI} opacity="0.55" />
    <CabDetails x={44} w={60} top={38} />
    <path d="M42 84h178v6H42z" fill={CHASSIS} />
    <path d="M40 74h6v12h-6z" fill={CHASSIS} />
    <Arch cx={70} r={15} />
    <Arch cx={172} r={15} />
    <Arch cx={200} r={15} />
    <Wheel cx={70} r={12.5} />
    <Wheel cx={172} r={12.5} />
    <Wheel cx={200} r={12.5} />
  </svg>
);

/** 10 тонн — өндөр битүү тэвш, гурван тэнхлэг */
const Truck10 = () => (
  <svg {...frame} role="img" aria-label="10 тонны ачааны машин">
    <defs>
      <linearGradient id="v-t10-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CAB_HI} />
        <stop offset="70%" stopColor={CAB} />
        <stop offset="100%" stopColor={CAB_LO} />
      </linearGradient>
      <linearGradient id="v-t10-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOX_HI} />
        <stop offset="55%" stopColor={BOX} />
        <stop offset="100%" stopColor={BOX_LO} />
      </linearGradient>
    </defs>
    <Shadow />
    <path d="M96 16h128v68H96z" fill="url(#v-t10-box)" />
    <path d="M96 16h128v8H96z" fill={BOX_LO} />
    <path d="M104 30h112v48H104z" fill="#fff" opacity="0.45" />
    <path d="M132 30v48M160 30v48M188 30v48" stroke={BOX_LO} strokeWidth="2" />
    <path d="M36 32h60v52H36z" fill="url(#v-t10-cab)" />
    {/* Унтлагын өрөө — өндөр кабин */}
    <path d="M36 32h60v10H36z" fill={CAB_HI} opacity="0.7" />
    <path d="M44 46h32v18H44z" fill={GLASS} />
    <path d="M44 46h32l-11 18H44z" fill={GLASS_HI} opacity="0.55" />
    <CabDetails x={36} w={60} top={32} />
    <path d="M34 84h192v6H34z" fill={CHASSIS} />
    <path d="M32 74h6v12h-6z" fill={CHASSIS} />
    <Arch cx={62} r={15} />
    <Arch cx={160} r={15} />
    <Arch cx={188} r={15} />
    <Arch cx={212} r={15} />
    <Wheel cx={62} r={12.5} />
    <Wheel cx={160} r={12.5} />
    <Wheel cx={188} r={12.5} />
    <Wheel cx={212} r={12.5} />
  </svg>
);

/** 20 тонн — чиргүүлтэй, тэвш нь тусдаа */
const Trailer20 = () => (
  <svg {...frame} role="img" aria-label="20 тонны чиргүүл">
    <defs>
      <linearGradient id="v-t20-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CAB_HI} />
        <stop offset="70%" stopColor={CAB} />
        <stop offset="100%" stopColor={CAB_LO} />
      </linearGradient>
      <linearGradient id="v-t20-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOX_HI} />
        <stop offset="55%" stopColor={BOX} />
        <stop offset="100%" stopColor={BOX_LO} />
      </linearGradient>
    </defs>
    <Shadow />
    {/* Чиргүүл нь татагчаас тусдаа биет */}
    <path d="M80 14h152v70H80z" fill="url(#v-t20-box)" />
    <path d="M80 14h152v8H80z" fill={BOX_LO} />
    <path d="M88 28h136v50H88z" fill="#fff" opacity="0.45" />
    <path d="M114 28v50M140 28v50M166 28v50M192 28v50" stroke={BOX_LO} strokeWidth="2" />
    {/* Холбоос */}
    <path d="M70 58h12v14H70z" fill={CHASSIS} />
    {/* Татагч — өндөр кабин, унтлагын өрөөтэй */}
    <path d="M22 26h50v58H22z" fill="url(#v-t20-cab)" />
    <path d="M22 26h50v12H22z" fill={CAB_HI} opacity="0.7" />
    <path d="M29 42h27v18H29z" fill={GLASS} />
    <path d="M29 42h27l-9 18H29z" fill={GLASS_HI} opacity="0.55" />
    {/* Яндан */}
    <path d="M74 30h4v30h-4z" fill="#8b939e" />
    <CabDetails x={22} w={50} top={26} />
    <path d="M20 84h214v6H20z" fill={CHASSIS} />
    <path d="M18 74h6v12h-6z" fill={CHASSIS} />
    <Arch cx={44} r={15} />
    <Arch cx={132} r={15} />
    <Arch cx={158} r={15} />
    <Arch cx={196} r={15} />
    <Arch cx={220} r={15} />
    <Wheel cx={44} r={12.5} />
    <Wheel cx={132} r={12.5} />
    <Wheel cx={158} r={12.5} />
    <Wheel cx={196} r={12.5} />
    <Wheel cx={220} r={12.5} />
  </svg>
);

const ART: Record<string, () => React.JSX.Element> = {
  porter: Porter,
  "truck-3": Truck3,
  "truck-5": Truck5,
  "truck-10": Truck10,
  "truck-20": Trailer20,
};

/**
 * Зураг байгаа эсэхийг шалгана.
 *
 * `<img>`-ыг шууд тавибал файл байхгүй үед хоосон хүрээ анивчина. Тиймээс
 * эхлээд вектор дүрслэлийг харуулж, зураг байгаа нь батлагдвал л солино.
 */
export function useImageExists(src: string): boolean {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    let live = true;
    setExists(false);
    const probe = new Image();
    probe.onload = () => {
      if (live) setExists(true);
    };
    probe.src = src;
    return () => {
      live = false;
    };
  }, [src]);

  return exists;
}

export function VehicleArt({ id, name }: { id: string; name?: string }) {
  const Art = ART[id] ?? Truck3;
  const src = `/vehicles/${id}.jpg`;
  const photo = useImageExists(src);

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Хүргэлтийн машин"}
        loading="lazy"
        className="h-full w-full rounded object-cover"
      />
    );
  }
  return <Art />;
}

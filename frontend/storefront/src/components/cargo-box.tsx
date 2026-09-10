"use client";

import type { VehicleBed } from "./cart-context";

/**
 * Тэвшний дотор талын изометр зураг.
 *
 * Урт × өргөн × өндөр гэсэн гурван тоог тусад нь уншихаас илүү, ачаа
 * багтах орон зайг нэг дүрсээр харуулна. Урд тал нь онгорхой — ачаагаа
 * хаанаас ачихыг харуулж, дотор талын хэмжээ гэдэг нь мэдрэгдэнэ.
 *
 * Гурван хэмжээ нь `VehicleBed`-ээс шууд ирнэ. Изометрийн 30° өнцөг нь
 * зөвхөн дүрслэл.
 */

const W = 230;
const H = 176;
const PAD = 26;

/** Изометрийн хэвтээ ба босоо коэффициент (30°) */
const CX = Math.cos(Math.PI / 6);
const CY = Math.sin(Math.PI / 6);

const EDGE = "#39414c";
const INNER = "#a6adb8";
const DIM = "#5b626d";
const FACE = "#f5911e";

const meters = (v: number): string => `${Number(v.toFixed(2))} м`;

export function CargoBox({ bed }: { bed: VehicleBed }) {
  const { lengthM: L, widthM: B, heightM: T } = bed;
  if (L <= 0 || B <= 0 || T <= 0) return null;

  // Дүрс хүрээндээ багтах хамгийн том масштаб
  const scale = Math.min(
    (W - PAD * 2) / (CX * (B + L)),
    (H - PAD * 2) / (CY * (B + L) + T),
  );

  /** Өргөний дагуу — баруун доош */
  const wx = CX * B * scale;
  const wy = CY * B * scale;
  /** Уртын дагуу — баруун дээш */
  const lx = CX * L * scale;
  const ly = -CY * L * scale;
  /** Өндрийн дагуу — дээш */
  const h = T * scale;

  // Эх цэг нь онгорхой талын доод зүүн булан. Дүрсийн хамгийн доод цэг
  // нь түүнээс өргөний хэмжээгээр доош байрлах тул түүгээр нь тулгана —
  // эс бөгөөс урт чиргүүлийн тааз хүрээнээс дээш гарна.
  const x0 = PAD;
  const y0 = H - PAD - wy;

  const P = (a: number, b: number, c: number) =>
    `${x0 + a * wx + b * lx},${y0 + a * wy + b * ly - c * h}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Тэвшний дотор ${meters(L)} × ${meters(B)} × ${meters(T)}`}>
      {/* Ар хана — онгорхой талаас цухуйж харагдана */}
      <polygon
        points={`${P(0, 1, 0)} ${P(1, 1, 0)} ${P(1, 1, 1)} ${P(0, 1, 1)}`}
        fill={FACE}
        fillOpacity="0.08"
        stroke={INNER}
        strokeWidth="1"
      />
      {/* Шал */}
      <polygon
        points={`${P(0, 0, 0)} ${P(1, 0, 0)} ${P(1, 1, 0)} ${P(0, 1, 0)}`}
        fill={FACE}
        fillOpacity="0.11"
        stroke={INNER}
        strokeWidth="1"
      />
      {/* Хажуугийн хана — баруун талд */}
      <polygon
        points={`${P(1, 0, 0)} ${P(1, 1, 0)} ${P(1, 1, 1)} ${P(1, 0, 1)}`}
        fill={FACE}
        fillOpacity="0.06"
        stroke={EDGE}
        strokeWidth="1.2"
      />
      {/* Тааз */}
      <polygon
        points={`${P(0, 0, 1)} ${P(1, 0, 1)} ${P(1, 1, 1)} ${P(0, 1, 1)}`}
        fill="#ffffff"
        fillOpacity="0.04"
        stroke={EDGE}
        strokeWidth="1.2"
      />
      {/* Онгорхой талын хүрээ */}
      <polygon
        points={`${P(0, 0, 0)} ${P(1, 0, 0)} ${P(1, 0, 1)} ${P(0, 0, 1)}`}
        fill="none"
        stroke={EDGE}
        strokeWidth="1.4"
      />

      {/* Өндөр — зүүн ирмэгийн дагуу */}
      <IsoDim
        from={P(0, 0, 0)}
        to={P(0, 0, 1)}
        label={meters(T)}
        offset={[-11, 0]}
        rotate={-90}
      />
      {/* Өргөн — доод зүүн ирмэг */}
      <IsoDim
        from={P(0, 0, 0)}
        to={P(1, 0, 0)}
        label={meters(B)}
        offset={[-6, 13]}
        rotate={30}
      />
      {/* Урт — доод баруун ирмэг */}
      <IsoDim
        from={P(1, 0, 0)}
        to={P(1, 1, 0)}
        label={meters(L)}
        offset={[6, 13]}
        rotate={-30}
      />
    </svg>
  );
}

/** Изометр ирмэгийн дагуух хэмжээс — шошго нь ирмэгтэйгээ зэрэгцэнэ */
function IsoDim({
  from,
  to,
  label,
  offset,
  rotate,
}: {
  from: string;
  to: string;
  label: string;
  offset: [number, number];
  rotate: number;
}) {
  const [x1, y1] = from.split(",").map(Number);
  const [x2, y2] = to.split(",").map(Number);
  const mx = (x1 + x2) / 2 + offset[0];
  const my = (y1 + y2) / 2 + offset[1];

  return (
    <g>
      <line
        x1={x1 + offset[0] * 0.55}
        y1={y1 + offset[1] * 0.55}
        x2={x2 + offset[0] * 0.55}
        y2={y2 + offset[1] * 0.55}
        stroke={DIM}
        strokeWidth="0.7"
      />
      <text
        x={mx}
        y={my}
        fontSize="9"
        textAnchor="middle"
        fill={DIM}
        fontWeight="600"
        transform={`rotate(${rotate} ${mx} ${my})`}
      >
        {label}
      </text>
    </g>
  );
}

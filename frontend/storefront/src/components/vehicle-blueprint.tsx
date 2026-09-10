"use client";

import { useId } from "react";
import type { Vehicle } from "./cart-context";
import { useImageExists } from "./vehicle-art";

/**
 * Машины хэмжээсийн зураг — үйлдвэрийн каталогийн дөрвөн харагдац.
 *
 * Дээрээс, урдаас, хажуугаас, араас нь нэг масштабаар зурна. Худалдан
 * авагч «хашааны хаалганд багтах уу, эргэх зай хүрэх үү, миний ачаа
 * тэвшинд яаж багтах вэ» гэдгээ тоо ширтэлгүй нүдээр шалгана.
 *
 * ХЭМЖЭЭСИЙН ШУГАМ ЗААСАН тоо бүр `VehicleSpec`, `VehicleBed`-ээс шууд
 * ирнэ. Кабины налуу, дугуйн радиус, толины хэмжээ зэрэг ХЭМЖЭЭС
 * ЗААГААГҮЙ хэсэг нь зөвхөн зургийн харьцаа — өгөгдөл биш. Хоёрыг
 * хольж болохгүй: хэмжээс заасан газарт таамаг тоо тавьбал байхгүй
 * мэдээллийг байгаа мэт харуулна.
 *
 * Цагаан дэвсгэр дээр зурсан нь санаатай — техникийн зураг цаасан дээр
 * байдаг шиг харагдаж, гэрэл зурагнаас ялгарна.
 */

const W = 460;
const H = 330;

const PAD_L = 40;
/** Дээрээс ба хажуугаас харсан харагдацын өргөн */
const COL1_W = 260;
const GAP = 36;
/** Урд ба ард харсан харагдацын өргөн */
const COL2_W = 86;

const ROW_H = 100;
const ROW1_TOP = 18;
const ROW1_BASE = ROW1_TOP + ROW_H;
const ROW2_TOP = 168;
const ROW2_BASE = ROW2_TOP + ROW_H;

const COL1_X = PAD_L;
const COL2_X = PAD_L + COL1_W + GAP;

/** Зургийн өнгө — сэдвийн хувьсагч биш, цаасны дүрслэл */
const PAPER = "#ffffff";
const EDGE = "#e2e5ea";
const BODY = "#39414c";
const DETAIL = "#a6adb8";
const DIM = "#5b626d";
const LOAD = "#f5911e";

/** 2 → "2 м", 1.185 → "1.19 м" */
const meters = (value: number): string => `${Number(value.toFixed(2))} м`;

export function VehicleBlueprint({
  vehicle,
  loadM3 = 0,
  className,
}: {
  vehicle: Vehicle;
  /** Ачааны овор, м³ — тэвшинд эзлэх хэсгийг сүүдэрлэнэ */
  loadM3?: number;
  className?: string;
}) {
  const uid = useId();
  const arrow = `${uid}-arrow`;
  const hatch = `${uid}-hatch`;
  const { spec, bed, shape } = vehicle;

  if (spec.lengthM <= 0 || spec.widthM <= 0 || spec.heightM <= 0) return null;

  // Дөрвөн харагдац нэг масштабтай байж л хоорондоо жишигдэнэ
  const s = Math.min(
    COL1_W / spec.lengthM,
    ROW_H / spec.widthM,
    ROW_H / spec.heightM,
    COL2_W / spec.widthM,
  );

  const L = spec.lengthM;
  const B = spec.widthM;
  const T = spec.heightM;
  const cabL = L - bed.lengthM;

  // Тэвшний шалны өндөр. Битүү тэвштэйд тэвшний тааз нь машины хамгийн
  // өндөр цэг; задгай тэвштэйд кабин илүү өндөр тул шалыг харьцаагаар
  // авна. Хоёулаа хэмжээс заагаагүй дүрслэлийн утга.
  const deck = shape === "pickup" ? T * 0.42 : T - bed.heightM;
  const cabTop = shape === "pickup" ? T : T * 0.72;
  /** Задгай тэвшний хажуугийн хана — ачааны өндөр биш */
  const wall = T * 0.2;
  const wheelR = T * 0.16;

  const axles: number[] =
    shape === "semi"
      ? [
          spec.frontOverhangM,
          cabL + 0.55,
          cabL + 0.55 + 1.35,
          spec.frontOverhangM + spec.wheelbaseM,
          spec.frontOverhangM + spec.wheelbaseM + 1.35,
        ]
      : [spec.frontOverhangM, spec.frontOverhangM + spec.wheelbaseM];

  const ratio = vehicle.volumeM3 > 0 && loadM3 > 0 ? loadM3 / vehicle.volumeM3 : 0;
  const fill = Math.min(1, ratio);
  const over = ratio > 1;

  // Хажуу ба дээрээс харах харагдацын эх цэг
  const sideX = COL1_X;
  const topX = COL1_X;
  const col2X = COL2_X + (COL2_W - B * s) / 2;

  /** Метрийг зургийн цэг рүү — хэвтээ, эх цэгээс баруун тийш */
  const X = (x0: number) => (v: number) => x0 + v * s;
  /** Метрийг зургийн цэг рүү — босоо, газраас дээш */
  const Y = (base: number) => (v: number) => base - v * s;

  const sx = X(sideX);
  const sy = Y(ROW2_BASE);
  const tx = X(topX);
  /** Дээрээс харахад голын шугамаас хазайх зай */
  const ty = (v: number) => ROW1_BASE - B * s + (B / 2 - v) * s;
  const fx = X(col2X);
  const fy = Y(ROW1_BASE);
  const rx = X(col2X);
  const ry = Y(ROW2_BASE);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "h-auto w-full rounded"}
      role="img"
      aria-label={`${vehicle.name} — гадна ${meters(L)} × ${meters(
        B,
      )} × ${meters(T)}, тэвш ${meters(bed.lengthM)} × ${meters(
        bed.widthM,
      )} × ${meters(bed.heightM)}`}
    >
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 z" fill={DIM} />
        </marker>
        <pattern
          id={hatch}
          width="6"
          height="6"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke={LOAD} strokeWidth="1.5" />
        </pattern>
      </defs>

      <rect
        x="0.5"
        y="0.5"
        width={W - 1}
        height={H - 1}
        rx="6"
        fill={PAPER}
        stroke={EDGE}
      />

      <ViewTitle x={COL1_X + COL1_W / 2} y={12}>
        ДЭЭРЭЭС
      </ViewTitle>
      <ViewTitle x={COL2_X + COL2_W / 2} y={12}>
        УРДААС
      </ViewTitle>
      <ViewTitle x={COL1_X + COL1_W / 2} y={ROW2_TOP - 8}>
        ХАЖУУГААС
      </ViewTitle>
      <ViewTitle x={COL2_X + COL2_W / 2} y={ROW2_TOP - 8}>
        АРААС
      </ViewTitle>

      <TopView
        x={tx}
        y={ty}
        s={s}
        L={L}
        B={B}
        cabL={cabL}
        bed={bed}
        shape={shape}
      />

      <FrontView
        x={fx}
        y={fy}
        s={s}
        B={B}
        T={T}
        cabTop={cabTop}
        deck={deck}
        wheelR={wheelR}
        shape={shape}
      />

      <SideView
        x={sx}
        y={sy}
        s={s}
        L={L}
        T={T}
        cabL={cabL}
        cabTop={cabTop}
        deck={deck}
        wall={wall}
        wheelR={wheelR}
        axles={axles}
        bed={bed}
        shape={shape}
        fill={fill}
        over={over}
        hatch={hatch}
      />

      <RearView
        x={rx}
        y={ry}
        s={s}
        B={B}
        T={T}
        deck={deck}
        wheelR={wheelR}
        bed={bed}
      />

      {/* ── Хэмжээс ── */}
      <g>
        <VDim
          x={topX - 18}
          y1={ROW1_BASE - B * s}
          y2={ROW1_BASE}
          edgeX={topX}
          marker={arrow}
          label={meters(B)}
        />
        <HDim
          x1={tx(cabL)}
          x2={tx(L)}
          y={ROW1_BASE + 13}
          edgeY={ROW1_BASE}
          marker={arrow}
          label={meters(bed.lengthM)}
        />

        <HDim
          x1={fx(0)}
          x2={fx(B)}
          y={ROW1_BASE + 13}
          edgeY={ROW1_BASE}
          marker={arrow}
          label={meters(B)}
        />
        <VDim
          x={fx(B) + 26}
          y1={fy(T)}
          y2={ROW1_BASE}
          edgeX={fx(B)}
          marker={arrow}
          label={meters(T)}
          flip
        />

        <VDim
          x={sideX - 18}
          y1={sy(T)}
          y2={ROW2_BASE}
          edgeX={sideX}
          marker={arrow}
          label={meters(T)}
        />
        <HDim
          x1={sx(0)}
          x2={sx(spec.frontOverhangM)}
          y={ROW2_BASE + 13}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.frontOverhangM)}
          small
        />
        <HDim
          x1={sx(spec.frontOverhangM)}
          x2={sx(spec.frontOverhangM + spec.wheelbaseM)}
          y={ROW2_BASE + 13}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.wheelbaseM)}
          small
        />
        <HDim
          x1={sx(spec.frontOverhangM + spec.wheelbaseM)}
          x2={sx(L)}
          y={ROW2_BASE + 13}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.rearOverhangM)}
          small
        />
        <HDim
          x1={sx(0)}
          x2={sx(L)}
          y={ROW2_BASE + 34}
          edgeY={ROW2_BASE + 22}
          marker={arrow}
          label={meters(L)}
        />

        <HDim
          x1={rx((B - bed.widthM) / 2)}
          x2={rx((B + bed.widthM) / 2)}
          y={ROW2_BASE + 13}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(bed.widthM)}
        />
        <VDim
          x={rx(B) + 26}
          y1={ry(deck + bed.heightM)}
          y2={ry(deck)}
          edgeX={rx(B)}
          marker={arrow}
          label={meters(bed.heightM)}
          flip
        />
      </g>
    </svg>
  );
}

/* ────────────────────────── Харагдацууд ────────────────────────── */

interface Bed {
  lengthM: number;
  widthM: number;
  heightM: number;
}

/** Дээрээс: кабин, салхин шил, толь, тэвшний талбай */
function TopView({
  x,
  y,
  s,
  L,
  B,
  cabL,
  bed,
  shape,
}: {
  x: (v: number) => number;
  y: (v: number) => number;
  s: number;
  L: number;
  B: number;
  cabL: number;
  bed: Bed;
  shape: string;
}) {
  const half = B / 2;
  const bedHalf = bed.widthM / 2;
  /** Толины гарц — хэмжээс заагаагүй дүрслэл */
  const mirror = B * 0.09;
  const nose = cabL * 0.16;
  const ribs = Math.min(7, Math.max(3, Math.round(bed.lengthM / 1.1)));

  return (
    <g>
      {/* Кабины контур — хамар нь бөөрөнхий */}
      <path
        d={`M${x(nose)} ${y(half)}
            L${x(cabL)} ${y(half)}
            L${x(cabL)} ${y(-half)}
            L${x(nose)} ${y(-half)}
            Q${x(0)} ${y(-half)} ${x(0)} ${y(-half + B * 0.22)}
            L${x(0)} ${y(half - B * 0.22)}
            Q${x(0)} ${y(half)} ${x(nose)} ${y(half)} Z`}
        fill="none"
        stroke={BODY}
        strokeWidth="1.4"
      />

      {/* Салхин шил */}
      <rect
        x={x(cabL * 0.2)}
        y={y(half - B * 0.06)}
        width={cabL * 0.28 * s}
        height={(B - B * 0.12) * s}
        rx="1.5"
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {/* Дээвэр */}
      <rect
        x={x(cabL * 0.52)}
        y={y(half - B * 0.1)}
        width={cabL * 0.38 * s}
        height={(B - B * 0.2) * s}
        rx="2"
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.9"
      />

      {/* Толь — бариул ба толбо */}
      {[1, -1].map((side) => (
        <g key={side}>
          <line
            x1={x(cabL * 0.4)}
            y1={y(side * half)}
            x2={x(cabL * 0.4)}
            y2={y(side * (half + mirror * 0.55))}
            stroke={DETAIL}
            strokeWidth="0.9"
          />
          <rect
            x={x(cabL * 0.28)}
            y={side > 0 ? y(half + mirror) : y(-half - mirror * 0.45)}
            width={cabL * 0.24 * s}
            height={mirror * 0.45 * s}
            rx="1"
            fill="none"
            stroke={DETAIL}
            strokeWidth="0.9"
          />
        </g>
      ))}

      {/* Тэвш */}
      <rect
        x={x(cabL)}
        y={y(bedHalf)}
        width={bed.lengthM * s}
        height={bed.widthM * s}
        fill={LOAD}
        fillOpacity="0.1"
        stroke={BODY}
        strokeWidth="1.3"
      />
      {/* Хөндлөвч — тэвшний урт мэдрэгдэнэ */}
      {Array.from({ length: ribs - 1 }, (_, i) => {
        const at = cabL + (bed.lengthM * (i + 1)) / ribs;
        return (
          <line
            key={at}
            x1={x(at)}
            y1={y(bedHalf)}
            x2={x(at)}
            y2={y(-bedHalf)}
            stroke={DETAIL}
            strokeWidth="0.7"
          />
        );
      })}
      {shape === "semi" ? (
        <line
          x1={x(cabL)}
          y1={y(half)}
          x2={x(cabL)}
          y2={y(-half)}
          stroke={DETAIL}
          strokeWidth="0.9"
          strokeDasharray="4 3"
        />
      ) : null}
    </g>
  );
}

/** Урдаас: кабин, салхин шил, арчигч, радиатор, гэрэл, толь, дугуй */
function FrontView({
  x,
  y,
  s,
  B,
  T,
  cabTop,
  deck,
  wheelR,
  shape,
}: {
  x: (v: number) => number;
  y: (v: number) => number;
  s: number;
  B: number;
  T: number;
  cabTop: number;
  deck: number;
  wheelR: number;
  shape: string;
}) {
  const inset = B * 0.07;
  const floor = wheelR * 0.5;
  const mirror = B * 0.09;
  const glassTop = cabTop * 0.94;
  const glassBottom = cabTop * 0.62;

  return (
    <g>
      {/* Битүү тэвш нь кабинаас өндөр — ард нь харагдана */}
      {shape !== "pickup" ? (
        <rect
          x={x(0)}
          y={y(T)}
          width={B * s}
          height={(T - deck) * s}
          fill="none"
          stroke={DETAIL}
          strokeWidth="1"
        />
      ) : null}

      {/* Кабин */}
      <rect
        x={x(0)}
        y={y(cabTop)}
        width={B * s}
        height={(cabTop - floor) * s}
        rx={B * 0.06 * s}
        fill="none"
        stroke={BODY}
        strokeWidth="1.4"
      />

      {/* Салхин шил ба арчигч */}
      <rect
        x={x(inset)}
        y={y(glassTop)}
        width={(B - inset * 2) * s}
        height={(glassTop - glassBottom) * s}
        rx="2"
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {[0.26, 0.56].map((at) => (
        <line
          key={at}
          x1={x(B * at)}
          y1={y(glassBottom + (glassTop - glassBottom) * 0.1)}
          x2={x(B * (at + 0.18))}
          y2={y(glassBottom + (glassTop - glassBottom) * 0.36)}
          stroke={DETAIL}
          strokeWidth="0.7"
        />
      ))}

      {/* Радиатор — хэвтээ сараалж */}
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={x(B * 0.28)}
          y1={y(cabTop * 0.52 - cabTop * 0.035 * i)}
          x2={x(B * 0.72)}
          y2={y(cabTop * 0.52 - cabTop * 0.035 * i)}
          stroke={DETAIL}
          strokeWidth="0.8"
        />
      ))}

      {/* Гэрэл */}
      {[B * 0.08, B * 0.79].map((left) => (
        <rect
          key={left}
          x={x(left)}
          y={y(cabTop * 0.5)}
          width={B * 0.13 * s}
          height={cabTop * 0.11 * s}
          rx="1.5"
          fill="none"
          stroke={DETAIL}
          strokeWidth="0.9"
        />
      ))}

      {/* Бампер */}
      <rect
        x={x(B * 0.02)}
        y={y(cabTop * 0.3)}
        width={B * 0.96 * s}
        height={cabTop * 0.13 * s}
        rx="1.5"
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.9"
      />

      {/* Толь */}
      {[-mirror, B].map((left) => (
        <rect
          key={left}
          x={x(left)}
          y={y(cabTop * 0.9)}
          width={mirror * s}
          height={cabTop * 0.2 * s}
          rx="1"
          fill="none"
          stroke={DETAIL}
          strokeWidth="0.9"
        />
      ))}

      {/* Дугуй */}
      {[0, B - B * 0.13].map((left) => (
        <rect
          key={left}
          x={x(left)}
          y={y(wheelR * 1.7)}
          width={B * 0.13 * s}
          height={wheelR * 1.7 * s}
          rx="1"
          fill="none"
          stroke={BODY}
          strokeWidth="1.2"
        />
      ))}
    </g>
  );
}

/** Хажуугаас: бүтэн контур, дугуйн хонгил, ачаа */
function SideView({
  x,
  y,
  s,
  L,
  T,
  cabL,
  cabTop,
  deck,
  wall,
  wheelR,
  axles,
  bed,
  shape,
  fill,
  over,
  hatch,
}: {
  x: (v: number) => number;
  y: (v: number) => number;
  s: number;
  L: number;
  T: number;
  cabL: number;
  cabTop: number;
  deck: number;
  wall: number;
  wheelR: number;
  axles: number[];
  bed: Bed;
  shape: string;
  fill: number;
  over: boolean;
  hatch: string;
}) {
  const box = shape !== "pickup";
  /** Их биений доод ирмэг — хүрээ, бамперын түвшин */
  const floor = T * 0.3;
  const bodyTop = box ? deck + bed.heightM : deck + wall;
  const archR = wheelR * 1.18;
  /** Тэвшний хавиргын тоо — уртаас хамаарна */
  const ribs = Math.min(8, Math.max(3, Math.round(bed.lengthM / 1.3)));

  /**
   * Доод ирмэг баруунаас зүүн тийш, дугуй бүр дээр нуман хонгилтой.
   * Каталогийн зураг дугуйг их биенээс тайрдаг тул контур нь машин шиг
   * харагдана — тэгш шугам бол хайрцаг шиг.
   */
  const underside = (from: number, to: number) => {
    let d = "";
    for (const at of axles.filter((a) => a > from && a < to).sort((a, b) => b - a)) {
      d += ` L${x(at + archR)} ${y(floor)}`;
      d += ` A ${archR * s} ${archR * s} 0 0 0 ${x(at - archR)} ${y(floor)}`;
    }
    return `${d} L${x(from)} ${y(floor)}`;
  };

  /** Тэвшний булангийн бөөрөнхийлөлт */
  const r = Math.min(0.12, bed.heightM * 0.06);

  const outline = box
    ? `M${x(0)} ${y(floor)}
       C${x(-0.02)} ${y(cabTop * 0.34)} ${x(-0.02)} ${y(cabTop * 0.6)} ${x(0)} ${y(cabTop * 0.84)}
       C${x(0.02)} ${y(cabTop * 0.97)} ${x(cabL * 0.06)} ${y(cabTop)} ${x(cabL * 0.17)} ${y(cabTop)}
       L${x(cabL)} ${y(cabTop)}
       L${x(cabL)} ${y(T - r)}
       Q${x(cabL)} ${y(T)} ${x(cabL + r)} ${y(T)}
       L${x(L - r)} ${y(T)}
       Q${x(L)} ${y(T)} ${x(L)} ${y(T - r)}
       L${x(L)} ${y(deck)}
       L${x(cabL)} ${y(deck)}
       L${x(cabL)} ${y(floor)}
       ${underside(0, cabL)} Z`
    : `M${x(0)} ${y(floor)}
       C${x(-0.03)} ${y(T * 0.34)} ${x(-0.03)} ${y(T * 0.46)} ${x(0.03)} ${y(T * 0.56)}
       C${x(0.09)} ${y(T * 0.68)} ${x(cabL * 0.08)} ${y(T * 0.94)} ${x(cabL * 0.17)} ${y(T)}
       L${x(cabL)} ${y(T)}
       L${x(cabL)} ${y(bodyTop)}
       L${x(L)} ${y(bodyTop)}
       L${x(L)} ${y(floor)}
       ${underside(0, L)} Z`;

  return (
    <g>
      <line
        x1={x(-0.3)}
        y1={y(0)}
        x2={x(L + 0.3)}
        y2={y(0)}
        stroke={EDGE}
        strokeWidth="1"
      />

      {/* Ачаа тэвшний хэдийг эзлэхийг сүүдэрлэнэ — контурын дор */}
      {fill > 0 ? (
        <rect
          x={x(cabL)}
          y={y(deck + bed.heightM)}
          width={bed.lengthM * fill * s}
          height={bed.heightM * s}
          fill={LOAD}
          fillOpacity="0.18"
        />
      ) : null}
      {over ? (
        <rect
          x={x(cabL)}
          y={y(deck + bed.heightM)}
          width={bed.lengthM * s}
          height={bed.heightM * s}
          fill={`url(#${hatch})`}
          opacity="0.3"
        />
      ) : null}

      <path d={outline} fill="none" stroke={BODY} strokeWidth="1.4" />

      {/* Хажуугийн цонх ба хаалга */}
      <path
        d={`M${x(cabL * 0.24)} ${y(cabTop * 0.93)}
            L${x(cabL * 0.86)} ${y(cabTop * 0.93)}
            L${x(cabL * 0.86)} ${y(cabTop * 0.64)}
            L${x(cabL * 0.28)} ${y(cabTop * 0.64)} Z`}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      <line
        x1={x(cabL * 0.88)}
        y1={y(cabTop * 0.96)}
        x2={x(cabL * 0.88)}
        y2={y(floor + (deck - floor) * 0.4)}
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {/* Хаалганы бариул */}
      <line
        x1={x(cabL * 0.7)}
        y1={y(cabTop * 0.55)}
        x2={x(cabL * 0.82)}
        y2={y(cabTop * 0.55)}
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {/* Гишгүүр */}
      <line
        x1={x(cabL * 0.2)}
        y1={y(floor + (deck - floor) * 0.25)}
        x2={x(cabL * 0.72)}
        y2={y(floor + (deck - floor) * 0.25)}
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {/* Урд гэрэл ба бампер */}
      <rect
        x={x(0.04)}
        y={y(cabTop * 0.48)}
        width={Math.max(2, cabL * 0.1 * s)}
        height={cabTop * 0.1 * s}
        rx="1"
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.8"
      />
      <line
        x1={x(0)}
        y1={y(floor + (cabTop * 0.3 - floor) * 0.5)}
        x2={x(cabL * 0.16)}
        y2={y(floor + (cabTop * 0.3 - floor) * 0.5)}
        stroke={DETAIL}
        strokeWidth="0.9"
      />

      {/* Шавар хамгаалагч — хойд дугуйн ард */}
      {axles.length > 0 ? (
        <rect
          x={x(axles[axles.length - 1] + archR * 0.92)}
          y={y(floor * 0.62)}
          width={Math.max(1.5, 0.06 * s)}
          height={(floor * 0.62 - wheelR * 0.2) * s}
          fill={DETAIL}
          opacity="0.5"
        />
      ) : null}

      {/* Тэвшний ирмэг */}
      {box ? (
        <>
          {/* Босоо хавирга — тэвшний урт мэдрэгдэнэ */}
          {Array.from({ length: ribs - 1 }, (_, i) => {
            const at = cabL + (bed.lengthM * (i + 1)) / ribs;
            return (
              <line
                key={at}
                x1={x(at)}
                y1={y(deck + bed.heightM * 0.97)}
                x2={x(at)}
                y2={y(deck + bed.heightM * 0.06)}
                stroke={DETAIL}
                strokeWidth="0.7"
              />
            );
          })}
          {/* Дээд ба доод хаяавч — хос шугам гүнзгийрүүлнэ */}
          <line
            x1={x(cabL)}
            y1={y(T - bed.heightM * 0.09)}
            x2={x(L)}
            y2={y(T - bed.heightM * 0.09)}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
          <line
            x1={x(cabL)}
            y1={y(deck + bed.heightM * 0.07)}
            x2={x(L)}
            y2={y(deck + bed.heightM * 0.07)}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
          <line
            x1={x(L - 0.08)}
            y1={y(T)}
            x2={x(L - 0.08)}
            y2={y(deck)}
            stroke={DETAIL}
            strokeWidth="0.9"
          />
          {shape === "semi" ? (
            <line
              x1={x(cabL)}
              y1={y(deck)}
              x2={x(cabL)}
              y2={y(floor)}
              stroke={DETAIL}
              strokeWidth="0.9"
              strokeDasharray="4 3"
            />
          ) : null}
        </>
      ) : (
        /* Задгай тэвшний ачааны багтаамжийг тасархай хүрээгээр */
        <rect
          x={x(cabL)}
          y={y(deck + bed.heightM)}
          width={bed.lengthM * s}
          height={bed.heightM * s}
          fill="none"
          stroke={DETAIL}
          strokeWidth="0.9"
          strokeDasharray="4 3"
        />
      )}

      {fill > 0 && fill < 1 ? (
        <line
          x1={x(cabL + bed.lengthM * fill)}
          y1={y(deck + bed.heightM)}
          x2={x(cabL + bed.lengthM * fill)}
          y2={y(deck)}
          stroke={LOAD}
          strokeWidth="1.1"
          strokeDasharray="3 2"
        />
      ) : null}

      {/* Дугуйн хаалт — их биен дээр товойсон нуман хаяавч */}
      {axles.map((at) => (
        <path
          key={`arch-${at}`}
          d={`M${x(at - archR * 1.16)} ${y(floor)}
              A ${archR * 1.16 * s} ${archR * 1.16 * s} 0 0 1 ${x(
                at + archR * 1.16,
              )} ${y(floor)}`}
          fill="none"
          stroke={DETAIL}
          strokeWidth="0.9"
        />
      ))}

      {/* Чиргүүлийн урд тулгуур */}
      {shape === "semi"
        ? [cabL + 3.4, cabL + 3.75].map((at) => (
            <line
              key={at}
              x1={x(at)}
              y1={y(deck)}
              x2={x(at)}
              y2={y(wheelR * 0.7)}
              stroke={DETAIL}
              strokeWidth="0.9"
            />
          ))
        : null}

      {axles.map((at) => (
        <g key={at}>
          <circle
            cx={x(at)}
            cy={y(wheelR)}
            r={wheelR * s}
            fill="none"
            stroke={BODY}
            strokeWidth="1.4"
          />
          {/* Дугуйн ул */}
          <circle
            cx={x(at)}
            cy={y(wheelR)}
            r={wheelR * 0.84 * s}
            fill="none"
            stroke={DETAIL}
            strokeWidth="0.7"
          />
          <circle
            cx={x(at)}
            cy={y(wheelR)}
            r={wheelR * 0.44 * s}
            fill="none"
            stroke={DETAIL}
            strokeWidth="0.9"
          />
          <circle cx={x(at)} cy={y(wheelR)} r={wheelR * 0.13 * s} fill={DETAIL} />
        </g>
      ))}
    </g>
  );
}

/** Араас: хаалга, нугас, бариул, гэрэл, бампер, дугуй */
function RearView({
  x,
  y,
  s,
  B,
  T,
  deck,
  wheelR,
  bed,
}: {
  x: (v: number) => number;
  y: (v: number) => number;
  s: number;
  B: number;
  T: number;
  deck: number;
  wheelR: number;
  bed: Bed;
}) {
  const left = (B - bed.widthM) / 2;
  const floor = wheelR * 0.5;
  const top = deck + bed.heightM;

  return (
    <g>
      <rect
        x={x(0)}
        y={y(T)}
        width={B * s}
        height={(T - floor) * s}
        rx="2"
        fill="none"
        stroke={BODY}
        strokeWidth="1.4"
      />

      {/* Тэвшний онгорхой ба хоёр хавтас хаалга */}
      <rect
        x={x(left)}
        y={y(top)}
        width={bed.widthM * s}
        height={bed.heightM * s}
        fill={LOAD}
        fillOpacity="0.1"
        stroke={BODY}
        strokeWidth="1.2"
      />
      <line
        x1={x(B / 2)}
        y1={y(top)}
        x2={x(B / 2)}
        y2={y(deck)}
        stroke={DETAIL}
        strokeWidth="0.9"
      />
      {/* Нугас */}
      {[0.82, 0.5, 0.18].map((at) =>
        [left, left + bed.widthM].map((lx) => (
          <line
            key={`${at}-${lx}`}
            x1={x(lx - B * 0.02)}
            y1={y(deck + bed.heightM * at)}
            x2={x(lx + B * 0.02)}
            y2={y(deck + bed.heightM * at)}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
        )),
      )}
      {/* Бариул */}
      {[-1, 1].map((side) => (
        <line
          key={side}
          x1={x(B / 2 + side * B * 0.03)}
          y1={y(deck + bed.heightM * 0.52)}
          x2={x(B / 2 + side * B * 0.03)}
          y2={y(deck + bed.heightM * 0.3)}
          stroke={DETAIL}
          strokeWidth="0.9"
        />
      ))}

      {/* Гэрэл */}
      {[B * 0.04, B - B * 0.14].map((lx) => (
        <rect
          key={lx}
          x={x(lx)}
          y={y(floor + (deck - floor) * 0.78)}
          width={B * 0.1 * s}
          height={(deck - floor) * 0.34 * s}
          rx="1.5"
          fill="none"
          stroke={DETAIL}
          strokeWidth="0.9"
        />
      ))}
      {/* Улсын дугаар */}
      <rect
        x={x(B * 0.4)}
        y={y(floor + (deck - floor) * 0.66)}
        width={B * 0.2 * s}
        height={(deck - floor) * 0.28 * s}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.8"
      />
      {/* Бампер */}
      <line
        x1={x(B * 0.06)}
        y1={y(floor + (deck - floor) * 0.24)}
        x2={x(B * 0.94)}
        y2={y(floor + (deck - floor) * 0.24)}
        stroke={DETAIL}
        strokeWidth="1"
      />

      {/* Дугуй */}
      {[0, B - B * 0.13].map((lx) => (
        <rect
          key={lx}
          x={x(lx)}
          y={y(wheelR * 1.7)}
          width={B * 0.13 * s}
          height={wheelR * 1.7 * s}
          rx="1"
          fill="none"
          stroke={BODY}
          strokeWidth="1.2"
        />
      ))}
    </g>
  );
}

/* ────────────────────────── Хэмжээсийн эд анги ────────────────────────── */

const ViewTitle = ({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) => (
  <text
    x={x}
    y={y}
    fontSize="7.5"
    textAnchor="middle"
    fill={DIM}
    letterSpacing="0.5"
  >
    {children}
  </text>
);

const Guide = (props: { x1: number; y1: number; x2: number; y2: number }) => (
  <line {...props} stroke={EDGE} strokeWidth="0.7" />
);

/** Хэвтээ хэмжээс — хоёр талдаа сумтай, доор нь шошготой */
const HDim = ({
  x1,
  x2,
  y,
  edgeY,
  marker,
  label,
  small,
}: {
  x1: number;
  x2: number;
  y: number;
  edgeY: number;
  marker: string;
  label: string;
  small?: boolean;
}) => (
  <g>
    <Guide x1={x1} y1={edgeY} x2={x1} y2={y + 4} />
    <Guide x1={x2} y1={edgeY} x2={x2} y2={y + 4} />
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke={DIM}
      strokeWidth="0.75"
      markerStart={`url(#${marker})`}
      markerEnd={`url(#${marker})`}
    />
    <text
      x={(x1 + x2) / 2}
      y={y + (small ? 8.5 : 10)}
      fontSize={small ? 7 : 8.5}
      textAnchor="middle"
      fill={DIM}
      fontWeight="600"
    >
      {label}
    </text>
  </g>
);

/** Босоо хэмжээс — шошго нь 90° эргэсэн */
const VDim = ({
  x,
  y1,
  y2,
  edgeX,
  marker,
  label,
  flip,
}: {
  x: number;
  y1: number;
  y2: number;
  edgeX: number;
  marker: string;
  label: string;
  flip?: boolean;
}) => {
  const labelX = flip ? x + 4 : x - 4;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <Guide x1={edgeX} y1={y1} x2={x + (flip ? -4 : 4)} y2={y1} />
      <Guide x1={edgeX} y1={y2} x2={x + (flip ? -4 : 4)} y2={y2} />
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={DIM}
        strokeWidth="0.75"
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={labelX}
        y={midY}
        fontSize="8.5"
        textAnchor="middle"
        fill={DIM}
        fontWeight="600"
        transform={`rotate(-90 ${labelX} ${midY})`}
      >
        {label}
      </text>
    </g>
  );
};

/**
 * Машины хэмжээсийн зураг.
 *
 * Үйлдвэрийн бодит хэмжээсийн зураг байвал түүнийг харуулна:
 * `public/vehicles/<id>-dimensions.png` (эсвэл `.jpg`). Байхгүй бол
 * дээрх вектор зурагт шилжинэ — зураг нэмэхэд код өөрчлөх шаардлагагүй.
 *
 * PNG-г эхэлж шалгана: хэмжээсийн зураг бол зураасан зураг, JPEG нь
 * нарийн шугамын эргэн тойронд бохир толбо үлдээдэг.
 */
export function VehicleDrawing({
  vehicle,
  loadM3 = 0,
}: {
  vehicle: Vehicle;
  loadM3?: number;
}) {
  const png = `/vehicles/${vehicle.id}-dimensions.png`;
  const jpg = `/vehicles/${vehicle.id}-dimensions.jpg`;
  const hasPng = useImageExists(png);
  const hasJpg = useImageExists(jpg);
  const real = hasPng ? png : hasJpg ? jpg : null;

  if (real) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={real}
        alt={`${vehicle.name} — үйлдвэрийн хэмжээсийн зураг`}
        loading="lazy"
        className="w-full rounded bg-white object-contain"
      />
    );
  }

  return <VehicleBlueprint vehicle={vehicle} loadM3={loadM3} />;
}

/** Үйлдвэрийн хэмжээсийн зураг байгаа эсэх — «дэлгэрэнгүй» холбоост */
export function useDimensionsImage(id: string): string | null {
  const png = `/vehicles/${id}-dimensions.png`;
  const jpg = `/vehicles/${id}-dimensions.jpg`;
  const hasPng = useImageExists(png);
  const hasJpg = useImageExists(jpg);
  return hasPng ? png : hasJpg ? jpg : null;
}

"use client";

import { useId } from "react";
import type { Vehicle, VehicleBed, VehicleSpec } from "./cart-context";
import { useImageExists } from "./vehicle-art";

/**
 * Машины хэмжээсийн зураг — үйлдвэрийн каталогийн дөрвөн харагдац.
 *
 * Дээрээс, урдаас, хажуугаас, араас нь нэг масштабаар зурна. Худалдан
 * авагч «хашааны хаалганд багтах уу, эргэх зай хүрэх үү, миний ачаа
 * тэвшинд яаж багтах вэ» гэдгээ тоо ширтэлгүй нүдээр шалгана.
 *
 * Хэмжээ бүр `VehicleSpec`, `VehicleBed`-ээс шууд ирнэ. Кабины хэлбэр,
 * дугуйн байрлал зэрэг зөвхөн дүрслэлийн зориулалттай хэсэгт хэмжээсийн
 * шугам заагаагүй — учир нь тэдгээр нь өгөгдөл биш, зургийн харьцаа.
 *
 * Машин хооронд масштаб ижил биш: нэг дор ганц машин харагддаг тул
 * хүрээг дүүргэсэн нь дээр. Машин хоорондын харьцааг `VehicleArt` дээрх
 * зураг харуулна.
 */

const W = 420;
const H = 300;

/** Зүүн талын босоо хэмжээсэд үлдээх зай */
const PAD_L = 38;
/** Дээрээс ба хажуугаас харсан харагдацын өргөн */
const COL1_W = 236;
const GAP = 34;
/** Урд ба ард харсан харагдацын өргөн */
const COL2_W = 74;

/** Мөр бүрийн зургийн өндөр */
const ROW_H = 92;
const ROW1_TOP = 16;
const ROW1_BASE = ROW1_TOP + ROW_H;
const ROW2_TOP = 152;
const ROW2_BASE = ROW2_TOP + ROW_H;

const COL1_X = PAD_L;
const COL2_X = PAD_L + COL1_W + GAP;

/** 2 → "2 м", 1.185 → "1.19 м" */
const meters = (value: number): string => `${Number(value.toFixed(2))} м`;

interface BlueprintProps {
  spec: VehicleSpec;
  bed: VehicleBed;
  /** Ачааны овор, м³ — тэвшинд эзлэх хэсгийг сүүдэрлэнэ */
  loadM3?: number;
  /** Тэвшний эзэлхүүн, м³ */
  volumeM3?: number;
  className?: string;
}

export function VehicleBlueprint({
  spec,
  bed,
  loadM3 = 0,
  volumeM3 = 0,
  className,
}: BlueprintProps) {
  const uid = useId();
  const arrow = `${uid}-arrow`;
  const hatch = `${uid}-hatch`;

  if (spec.lengthM <= 0 || spec.widthM <= 0 || spec.heightM <= 0) return null;

  // Дөрвөн харагдац нэг масштабтай байж л хоорондоо жишигдэнэ
  const scale = Math.min(
    COL1_W / spec.lengthM,
    ROW_H / spec.widthM,
    ROW_H / spec.heightM,
    COL2_W / spec.widthM,
  );

  const length = spec.lengthM * scale;
  const width = spec.widthM * scale;
  const height = spec.heightM * scale;
  const bedLength = bed.lengthM * scale;
  const bedWidth = bed.widthM * scale;
  const bedHeight = bed.heightM * scale;

  // Тэвшийг ар талд нь наасан гэж үзнэ — үлдсэн нь кабин ба хамар
  const cabLength = length - bedLength;
  // Тэвшний шал: гадна өндрөөс тэвшний өндрийг хассан зай. Энэ нь
  // тооцоолсон утга тул хэмжээсийн шугам заахгүй.
  const deck = height - bedHeight;

  const topY = ROW1_BASE - width;
  const bedTopY = topY + (width - bedWidth) / 2;
  const sideY = ROW2_BASE - height;
  const frontY = ROW1_BASE - height;
  const rearY = ROW2_BASE - height;
  const col2CenterX = COL2_X + (COL2_W - width) / 2;

  // Задгай тэвштэй машинд кабин хамгийн өндөр цэг; битүү тэвштэйд тэвш
  // нь кабинаас өндөр. Энэ харьцаа нь зөвхөн дүрслэл.
  const cabHeight = bed.heightM <= 1.2 ? height : height * 0.78;
  const wheelRadius = Math.max(3, deck * 0.35);
  const frontAxleX = COL1_X + spec.frontOverhangM * scale;
  const rearAxleX =
    COL1_X + (spec.frontOverhangM + spec.wheelbaseM) * scale;
  // Урт машин хос тэнхлэгтэй — дүрслэлийн нарийвчлал
  const tandem = spec.lengthM >= 9;

  const ratio = volumeM3 > 0 && loadM3 > 0 ? loadM3 / volumeM3 : 0;
  const fill = Math.min(1, ratio);
  const over = ratio > 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label={`Хэмжээ: гадна ${meters(spec.lengthM)} × ${meters(
        spec.widthM,
      )} × ${meters(spec.heightM)}, тэвш ${meters(bed.lengthM)} × ${meters(
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
          <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
        </marker>
        {/* Ачаа тэвшнээс хэтэрсэнийг ташуу зураасаар ялгана */}
        <pattern
          id={hatch}
          width="6"
          height="6"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-brand"
          />
        </pattern>
      </defs>

      <ViewTitle x={COL1_X + COL1_W / 2} y={10}>
        ДЭЭРЭЭС
      </ViewTitle>
      <ViewTitle x={COL2_X + COL2_W / 2} y={10}>
        УРДААС
      </ViewTitle>
      <ViewTitle x={COL1_X + COL1_W / 2} y={ROW2_TOP - 6}>
        ХАЖУУГААС
      </ViewTitle>
      <ViewTitle x={COL2_X + COL2_W / 2} y={ROW2_TOP - 6}>
        АРААС
      </ViewTitle>

      {/* ── Дээрээс: гадна габарит дотор тэвшний талбай ── */}
      <g>
        <Outline x={COL1_X} y={topY} width={length} height={width} />
        <rect
          x={COL1_X + cabLength}
          y={bedTopY}
          width={bedLength}
          height={bedWidth}
          className="fill-brand/10"
        />
        <Outline
          x={COL1_X + cabLength}
          y={bedTopY}
          width={bedLength}
          height={bedWidth}
          thin
        />
      </g>

      {/* ── Урдаас ── */}
      <Outline x={col2CenterX} y={frontY} width={width} height={height} />

      {/* ── Хажуугаас: кабин, тэвш, дугуй ── */}
      <g>
        <line
          x1={COL1_X - 10}
          y1={ROW2_BASE}
          x2={COL1_X + length + 10}
          y2={ROW2_BASE}
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="3 3"
          className="text-ink-700"
        />

        {/* Кабин — хэмжээс заагаагүй дүрслэл */}
        <polygon
          points={[
            `${COL1_X},${ROW2_BASE}`,
            `${COL1_X},${ROW2_BASE - cabHeight * 0.55}`,
            `${COL1_X + cabLength * 0.34},${ROW2_BASE - cabHeight}`,
            `${COL1_X + cabLength},${ROW2_BASE - cabHeight}`,
            `${COL1_X + cabLength},${ROW2_BASE}`,
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          className="text-mute"
        />

        {/* Тэвш — ачаа эзлэх хэсгийг дотор нь сүүдэрлэнэ */}
        {fill > 0 ? (
          <rect
            x={COL1_X + cabLength}
            y={ROW2_BASE - deck - bedHeight}
            width={bedLength * fill}
            height={bedHeight}
            className="fill-brand/20"
          />
        ) : null}
        {over ? (
          <rect
            x={COL1_X + cabLength}
            y={ROW2_BASE - deck - bedHeight}
            width={bedLength}
            height={bedHeight}
            fill={`url(#${hatch})`}
            opacity="0.35"
          />
        ) : null}
        <Outline
          x={COL1_X + cabLength}
          y={ROW2_BASE - deck - bedHeight}
          width={bedLength}
          height={bedHeight}
        />
        {fill > 0 && fill < 1 ? (
          <line
            x1={COL1_X + cabLength + bedLength * fill}
            y1={ROW2_BASE - deck - bedHeight}
            x2={COL1_X + cabLength + bedLength * fill}
            y2={ROW2_BASE - deck}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 2"
            className="text-brand"
          />
        ) : null}

        {/* Хүрээ */}
        <line
          x1={COL1_X + cabLength * 0.5}
          y1={ROW2_BASE - deck}
          x2={COL1_X + length}
          y2={ROW2_BASE - deck}
          stroke="currentColor"
          strokeWidth="1.1"
          className="text-mute"
        />

        <Wheel cx={frontAxleX} cy={ROW2_BASE - wheelRadius} r={wheelRadius} />
        <Wheel cx={rearAxleX} cy={ROW2_BASE - wheelRadius} r={wheelRadius} />
        {tandem ? (
          <Wheel
            cx={rearAxleX - wheelRadius * 2.2}
            cy={ROW2_BASE - wheelRadius}
            r={wheelRadius}
          />
        ) : null}
      </g>

      {/* ── Араас: тэвшний онгорхойн хэмжээ ── */}
      <g>
        <Outline x={col2CenterX} y={rearY} width={width} height={height} />
        <rect
          x={col2CenterX + (width - bedWidth) / 2}
          y={ROW2_BASE - deck - bedHeight}
          width={bedWidth}
          height={bedHeight}
          className="fill-brand/10"
        />
        <Outline
          x={col2CenterX + (width - bedWidth) / 2}
          y={ROW2_BASE - deck - bedHeight}
          width={bedWidth}
          height={bedHeight}
          thin
        />
      </g>

      <g className="text-mute-dim">
        {/* Дээрээс: гадна өргөн зүүнд, тэвшний урт доор */}
        <VDim
          x={COL1_X - 16}
          y1={topY}
          y2={ROW1_BASE}
          edgeX={COL1_X}
          marker={arrow}
          label={meters(spec.widthM)}
        />
        <HDim
          x1={COL1_X + cabLength}
          x2={COL1_X + length}
          y={ROW1_BASE + 12}
          edgeY={ROW1_BASE}
          marker={arrow}
          label={meters(bed.lengthM)}
        />

        {/* Урдаас: өргөн доор, гадна өндөр баруунд */}
        <HDim
          x1={col2CenterX}
          x2={col2CenterX + width}
          y={ROW1_BASE + 12}
          edgeY={ROW1_BASE}
          marker={arrow}
          label={meters(spec.widthM)}
        />
        <VDim
          x={col2CenterX + width + 16}
          y1={frontY}
          y2={ROW1_BASE}
          edgeX={col2CenterX + width}
          marker={arrow}
          label={meters(spec.heightM)}
          flip
        />

        {/* Хажуугаас: гадна өндөр зүүнд, гарц ба гүүр хоорондын зай доор */}
        <VDim
          x={COL1_X - 16}
          y1={sideY}
          y2={ROW2_BASE}
          edgeX={COL1_X}
          marker={arrow}
          label={meters(spec.heightM)}
        />
        <HDim
          x1={COL1_X}
          x2={frontAxleX}
          y={ROW2_BASE + 12}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.frontOverhangM)}
          small
        />
        <HDim
          x1={frontAxleX}
          x2={rearAxleX}
          y={ROW2_BASE + 12}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.wheelbaseM)}
          small
        />
        <HDim
          x1={rearAxleX}
          x2={COL1_X + length}
          y={ROW2_BASE + 12}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(spec.rearOverhangM)}
          small
        />
        <HDim
          x1={COL1_X}
          x2={COL1_X + length}
          y={ROW2_BASE + 32}
          edgeY={ROW2_BASE + 20}
          marker={arrow}
          label={meters(spec.lengthM)}
        />

        {/* Араас: тэвшний өргөн доор, тэвшний өндөр баруунд */}
        <HDim
          x1={col2CenterX + (width - bedWidth) / 2}
          x2={col2CenterX + (width + bedWidth) / 2}
          y={ROW2_BASE + 12}
          edgeY={ROW2_BASE}
          marker={arrow}
          label={meters(bed.widthM)}
        />
        <VDim
          x={col2CenterX + width + 16}
          y1={ROW2_BASE - deck - bedHeight}
          y2={ROW2_BASE - deck}
          edgeX={col2CenterX + width}
          marker={arrow}
          label={meters(bed.heightM)}
          flip
        />
      </g>
    </svg>
  );
}

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
    fill="currentColor"
    className="text-mute-dim"
  >
    {children}
  </text>
);

/** Харагдацын гадна хүрээ */
const Outline = ({
  x,
  y,
  width,
  height,
  thin,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  thin?: boolean;
}) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    fill="none"
    stroke="currentColor"
    strokeWidth={thin ? 0.9 : 1.25}
    className={thin ? "text-mute-dim" : "text-mute"}
  />
);

const Wheel = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      className="text-mute"
    />
    <circle
      cx={cx}
      cy={cy}
      r={r * 0.45}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
      className="text-mute-dim"
    />
  </g>
);

/** Хэвтээ хэмжээс — дүрснээс доош татсан туслах шугам, хоёр талдаа сумтай */
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
      stroke="currentColor"
      strokeWidth="0.75"
      markerStart={`url(#${marker})`}
      markerEnd={`url(#${marker})`}
    />
    <text
      x={(x1 + x2) / 2}
      y={y + (small ? 8.5 : 10)}
      fontSize={small ? 7 : 8.5}
      textAnchor="middle"
      fill="currentColor"
      className="font-semibold"
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
  /** Шошгыг баруун талд байрлуулах */
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
        stroke="currentColor"
        strokeWidth="0.75"
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={labelX}
        y={midY}
        fontSize="8.5"
        textAnchor="middle"
        fill="currentColor"
        className="font-semibold"
        transform={`rotate(-90 ${labelX} ${midY})`}
      >
        {label}
      </text>
    </g>
  );
};

/** Дүрснээс хэмжээс рүү сунгасан нимгэн туслах шугам */
const Guide = (props: { x1: number; y1: number; x2: number; y2: number }) => (
  <line
    {...props}
    stroke="currentColor"
    strokeWidth="0.6"
    className="text-ink-700"
  />
);

/**
 * Машины хэмжээсийн зураг.
 *
 * Үйлдвэрийн бодит хэмжээсийн зураг байвал түүнийг харуулна:
 * `public/vehicles/<id>-dimensions.jpg` (`VEHICLES`-ийн id — porter,
 * truck-3, truck-5, truck-10, truck-20). Файл байхгүй бол доорх вектор
 * зурагт шилжинэ — ингэснээр зургаа нэмэхэд код өөрчлөх шаардлагагүй.
 */
export function VehicleDrawing({
  vehicle,
  loadM3 = 0,
}: {
  vehicle: Vehicle;
  loadM3?: number;
}) {
  const src = dimensionsSrc(vehicle.id);
  const real = useImageExists(src);

  if (real) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${vehicle.name} — үйлдвэрийн хэмжээсийн зураг`}
        loading="lazy"
        className="w-full rounded bg-white object-contain"
      />
    );
  }

  return (
    <VehicleBlueprint
      spec={vehicle.spec}
      bed={vehicle.bed}
      loadM3={loadM3}
      volumeM3={vehicle.volumeM3}
    />
  );
}

/** Үйлдвэрийн хэмжээсийн зургийн зам */
export const dimensionsSrc = (id: string): string =>
  `/vehicles/${id}-dimensions.jpg`;

"use client";

import { useId } from "react";
import type { VehicleBed } from "./cart-context";

/**
 * Тэвшний техникийн хэмжээсийн зураг.
 *
 * «Миний ачаа энэ машинд багтах уу» гэдгийг тоо ширтэж бодохын оронд
 * нүдээр шалгуулах зорилготой: хажуу ба ар талыг үйлдвэрийн каталогийн
 * маягаар, хэмжээсийн сумтай нь зурна.
 *
 * Хоёр харагдац нэг масштабтай тул өндөр нь хоорондоо таарна. Харин
 * машин хооронд масштаб ижил биш — нэг дор ганц машин харагддаг тул
 * дэлгэцийг дүүргэж, уншигдац сайжирсан нь дээр. Машин хоорондын
 * харьцааг `VehicleArt` дээрх зураг харуулна.
 *
 * Зөвхөн `bed`-ийн гурван хэмжээг зурна — кабин зэрэг зохиосон хэсэг
 * нэмбэл байхгүй мэдээллийг байгаа мэт харуулах тул оруулаагүй.
 */

const W = 300;
const H = 142;
/** Босоо хэмжээсийн шугамд үлдээх зай */
const PAD_L = 30;
/** Хэвтээ хэмжээсийн шугамд үлдээх зай */
const PAD_B = 28;
/** Харагдацын гарчигт үлдээх зай */
const PAD_T = 18;
const SIDE_W = 148;
const GAP = 26;
const REAR_W = 76;

const BODY_H = H - PAD_T - PAD_B;
const BASE_Y = PAD_T + BODY_H;

/** Хэмжээг уншихад эвтэйхэн: 2 → "2 м", 2.45 → "2.45 м" */
const meters = (value: number): string => `${Number(value.toFixed(2))} м`;

interface BlueprintProps {
  bed: VehicleBed;
  /** Ачааны овор, м³ — тэвшинд эзлэх хэсгийг сүүдэрлэнэ */
  loadM3?: number;
  /** Тэвшний эзэлхүүн, м³ */
  volumeM3?: number;
  className?: string;
}

export function VehicleBlueprint({
  bed,
  loadM3 = 0,
  volumeM3 = 0,
  className,
}: BlueprintProps) {
  const id = useId();
  const arrow = `${id}-arrow`;
  const hatch = `${id}-hatch`;

  if (bed.lengthM <= 0 || bed.widthM <= 0 || bed.heightM <= 0) return null;

  // Гурван хязгаарын аль багад нь багтаана: өндөр, хажуугийн урт, арын өргөн
  const scale = Math.min(
    BODY_H / bed.heightM,
    SIDE_W / bed.lengthM,
    REAR_W / bed.widthM,
  );
  const length = bed.lengthM * scale;
  const width = bed.widthM * scale;
  const height = bed.heightM * scale;

  const sideX = PAD_L + (SIDE_W - length) / 2;
  const rearX = PAD_L + SIDE_W + GAP + (REAR_W - width) / 2;
  const topY = BASE_Y - height;

  // Ачаа тэвшний хэдэн хувийг эзлэхийг хажуу талын дүрсээр харуулна
  const ratio = volumeM3 > 0 && loadM3 > 0 ? loadM3 / volumeM3 : 0;
  const fill = Math.min(1, ratio);
  const over = ratio > 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "h-full w-full"}
      role="img"
      aria-label={`Тэвшний хэмжээ: урт ${meters(bed.lengthM)}, өргөн ${meters(
        bed.widthM,
      )}, өндөр ${meters(bed.heightM)}`}
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

      <g className="text-mute-dim" fill="currentColor">
        <text x={PAD_L + SIDE_W / 2} y={11} fontSize="7.5" textAnchor="middle">
          ХАЖУУ ТАЛ
        </text>
        <text
          x={PAD_L + SIDE_W + GAP + REAR_W / 2}
          y={11}
          fontSize="7.5"
          textAnchor="middle"
        >
          АР ТАЛ
        </text>
      </g>

      {/* Газрын шугам — хоёр харагдац нэг түвшинд суусныг харуулна */}
      <line
        x1={PAD_L - 8}
        y1={BASE_Y}
        x2={W - 6}
        y2={BASE_Y}
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="3 3"
        className="text-ink-700"
      />

      {/* Хажуу тал */}
      <g>
        {fill > 0 ? (
          <rect
            x={sideX}
            y={topY}
            width={length * fill}
            height={height}
            className="fill-brand/20"
          />
        ) : null}
        {over ? (
          <rect
            x={sideX}
            y={topY}
            width={length}
            height={height}
            fill={`url(#${hatch})`}
            opacity="0.35"
          />
        ) : null}
        <rect
          x={sideX}
          y={topY}
          width={length}
          height={height}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="text-mute"
        />
        {fill > 0 && fill < 1 ? (
          <line
            x1={sideX + length * fill}
            y1={topY}
            x2={sideX + length * fill}
            y2={BASE_Y}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 2"
            className="text-brand"
          />
        ) : null}
      </g>

      {/* Ар тал */}
      <rect
        x={rearX}
        y={topY}
        width={width}
        height={height}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-mute"
      />

      <g className="text-mute-dim">
        {/* Урт — хажуу талын доор */}
        <Extension x1={sideX} y1={BASE_Y} x2={sideX} y2={BASE_Y + 16} />
        <Extension
          x1={sideX + length}
          y1={BASE_Y}
          x2={sideX + length}
          y2={BASE_Y + 16}
        />
        <Dim
          x1={sideX}
          y1={BASE_Y + 12}
          x2={sideX + length}
          y2={BASE_Y + 12}
          marker={arrow}
        />
        <Label x={sideX + length / 2} y={BASE_Y + 24}>
          {meters(bed.lengthM)}
        </Label>

        {/* Өндөр — хажуу талын зүүн талд */}
        <Extension x1={sideX} y1={topY} x2={sideX - 18} y2={topY} />
        <Extension x1={sideX} y1={BASE_Y} x2={sideX - 18} y2={BASE_Y} />
        <Dim
          x1={sideX - 14}
          y1={topY}
          x2={sideX - 14}
          y2={BASE_Y}
          marker={arrow}
        />
        <Label
          x={sideX - 18}
          y={topY + height / 2}
          transform={`rotate(-90 ${sideX - 18} ${topY + height / 2})`}
        >
          {meters(bed.heightM)}
        </Label>

        {/* Өргөн — арын доор */}
        <Extension x1={rearX} y1={BASE_Y} x2={rearX} y2={BASE_Y + 16} />
        <Extension
          x1={rearX + width}
          y1={BASE_Y}
          x2={rearX + width}
          y2={BASE_Y + 16}
        />
        <Dim
          x1={rearX}
          y1={BASE_Y + 12}
          x2={rearX + width}
          y2={BASE_Y + 12}
          marker={arrow}
        />
        <Label x={rearX + width / 2} y={BASE_Y + 24}>
          {meters(bed.widthM)}
        </Label>
      </g>
    </svg>
  );
}

/** Хэмжээсийн туслах шугам — дүрснээс хэмжээс рүү сунгасан нимгэн зураас */
const Extension = (props: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) => (
  <line
    {...props}
    stroke="currentColor"
    strokeWidth="0.6"
    className="text-ink-700"
  />
);

/** Хоёр талдаа сумтай хэмжээсийн шугам */
const Dim = ({
  marker,
  ...props
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  marker: string;
}) => (
  <line
    {...props}
    stroke="currentColor"
    strokeWidth="0.75"
    markerStart={`url(#${marker})`}
    markerEnd={`url(#${marker})`}
  />
);

const Label = ({
  children,
  ...props
}: {
  x: number;
  y: number;
  transform?: string;
  children: React.ReactNode;
}) => (
  <text
    {...props}
    fontSize="8.5"
    textAnchor="middle"
    fill="currentColor"
    className="font-semibold"
  >
    {children}
  </text>
);

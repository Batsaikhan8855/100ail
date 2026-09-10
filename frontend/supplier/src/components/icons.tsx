import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 20,
  height: 20,
  ...props,
});

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const CartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6" />
    <circle cx="10" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-7.5-9.5A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z" />
  </svg>
);

export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
    <path d="m4 7 8 4 8-4M12 11v10" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const SortIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
  </svg>
);

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
  </svg>
);

export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h15m0 0-5-5m5 5-5 5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7h10v9H3zM13 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v6c0 4.2 2.9 7.5 7 9 4.1-1.5 7-4.8 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const HeadsetIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
    <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
    <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
    <path d="M19.5 19v.5a2.5 2.5 0 0 1-2.5 2.5h-2" />
  </svg>
);

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 4 2.5 5.1 5.5.8-4 3.9.95 5.6L12 16.8 7.05 19.4 8 13.8l-4-3.9 5.5-.8L12 4Z" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

export const WarehouseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10 12 5l9 5v9H3v-9Z" />
    <path d="M8 19v-5h8v5" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14.5 5-6 7 6 7" />
  </svg>
);

/* ---------- Ангиллын дүрс тэмдэг ---------- */

export const CementIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5h8l1 4v10H7V9l1-4Z" />
    <path d="M9.5 9h5" />
  </svg>
);

export const BrickIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="5" rx="1" />
    <rect x="3" y="13" width="18" height="5" rx="1" />
    <path d="M11 6v5M14 13v5" />
  </svg>
);

export const RebarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 18 10 6M9 18 15 6M14 18 20 6" />
    <path d="M5.6 14.5h13M7.4 10h13" />
  </svg>
);

export const WoodIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 14 8-4 10 3-8 4z" />
    <path d="m3 14v2.5l10 3 8-4V13" />
  </svg>
);

export const RoofIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 15 4.5-5 4.5 5 4.5-5L21 15" />
    <path d="m3 19 4.5-5 4.5 5 4.5-5L21 19" />
  </svg>
);

export const InsulationIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M9 5v14M15 5v14" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

export const PlumbingIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4v6a5 5 0 0 0 5 5h1" />
    <rect x="4.5" y="3" width="5" height="3" rx="1" />
    <path d="M13 12h4v6h-4z" />
  </svg>
);

export const ElectricIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
  </svg>
);

export const PaintIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="11" height="6" rx="1.5" />
    <path d="M14 9h4v4h-2v7h-3" />
    <path d="M6 6V4.5h5V6" />
  </svg>
);

export const ToolsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14.5 4 5.5 5.5-2 2-5.5-5.5z" />
    <path d="m12.5 6-8 8-.5 4 4-.5 8-8" />
    <path d="M4 4l3.5 3.5" />
  </svg>
);

/**
 * Брэндийн лого.
 *
 * Бусад дүрсээс ялгаатай нь вектор биш, зураг: логоны налалт өнгө,
 * гэрэлтэлтийг `currentColor`-оор давтах боломжгүй. Дуудаж буй газрууд
 * `className`-аар хэмжээг нь өөрчилдөг тул өргөн, өндрийг CSS давхарлана.
 */
export const LogoMark = ({ className }: { className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/logo.png"
    alt=""
    width={38}
    height={38}
    aria-hidden
    className={`shrink-0 object-contain ${className ?? ""}`}
  />
);

export const CATEGORY_ICONS = {
  cement: CementIcon,
  brick: BrickIcon,
  rebar: RebarIcon,
  wood: WoodIcon,
  roof: RoofIcon,
  insulation: InsulationIcon,
  plumbing: PlumbingIcon,
  electric: ElectricIcon,
  paint: PaintIcon,
  tools: ToolsIcon,
} as const;

export const TRUST_ICONS = {
  truck: TruckIcon,
  shield: ShieldIcon,
  headset: HeadsetIcon,
} as const;

/* Хяналтын самбарын нэмэлт дүрсүүд */

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const WalletIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2Z" />
    <circle cx="17" cy="14" r="1" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 6M17 19a6 6 0 0 0-1.5-4" />
  </svg>
);

export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
    <path d="m15 8 4 4-4 4M19 12H9" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const FileIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h8l4 4v14H6V3Z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 5-5 4 4 3-3 4 4" />
  </svg>
);

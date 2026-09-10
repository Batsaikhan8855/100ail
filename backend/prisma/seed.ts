/**
 * Анхны өгөгдөл: ангилал, үзүүлэлт, бүтээгдэхүүн, нийлүүлэгч, санал,
 * агуулах (координаттай), үлдэгдэл, хэрэглэгч, урамшуулал, үнэлгээ,
 * сурталчилгааны баннер, нийлүүлэгчийн дансны мэдээлэл.
 *
 * Ажиллуулах: npm run db:seed
 */
import { PrismaClient, AttributeType, BannerPlacement, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CITIES = ["Улаанбаатар", "Дархан", "Эрдэнэт", "Орон нутаг"] as const;

interface SupplierSeed {
  slug: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  cities: string[];
}

/** Агуулахын байршил: хот бүрийн төв цэг (Google Maps/Mapbox дээр харагдана) */
const CITY_POINTS: Record<string, { lat: number; lng: number }> = {
  Улаанбаатар: { lat: 47.9186, lng: 106.9176 },
  Дархан: { lat: 49.4867, lng: 105.9228 },
  Эрдэнэт: { lat: 49.0347, lng: 104.0839 },
};

/** Нэг хотод олон агуулах давхцахгүйн тулд бага зэрэг тараана */
const scatter = (city: string, seed: string) => {
  const base = CITY_POINTS[city];
  if (!base) return { lat: null, lng: null };
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    lat: Number((base.lat + ((hash % 17) - 8) * 0.004).toFixed(5)),
    lng: Number((base.lng + ((hash % 23) - 11) * 0.006).toFixed(5)),
  };
};

const SUPPLIERS: SupplierSeed[] = [
  { slug: "montsement", name: "Монцемент ХХК", verified: true, rating: 4.8, reviewCount: 214, cities: ["Улаанбаатар"] },
  { slug: "barilga-eco", name: "Барилга Эко ХХК", verified: true, rating: 4.6, reviewCount: 132, cities: ["Улаанбаатар"] },
  { slug: "aeroblock", name: "Аэроблок ХХК", verified: true, rating: 4.4, reviewCount: 76, cities: ["Дархан", "Улаанбаатар"] },
  { slug: "gan-trade", name: "Ган Трейд ХХК", verified: true, rating: 4.7, reviewCount: 189, cities: ["Улаанбаатар"] },
  { slug: "isover-mongol", name: "Изовер Монгол", verified: true, rating: 4.5, reviewCount: 98, cities: ["Улаанбаатар"] },
  { slug: "wood-mongol", name: "Вүүд Монгол ХХК", verified: true, rating: 4.3, reviewCount: 54, cities: ["Эрдэнэт", "Улаанбаатар"] },
  { slug: "altan-group", name: "Алтан Групп", verified: true, rating: 4.5, reviewCount: 205, cities: ["Улаанбаатар", "Дархан"] },
  { slug: "stroy-market", name: "Строй Маркет", verified: false, rating: 3.9, reviewCount: 41, cities: ["Улаанбаатар", "Эрдэнэт"] },
  { slug: "khass", name: "Хасс ХХК", verified: true, rating: 4.6, reviewCount: 143, cities: ["Улаанбаатар"] },
  { slug: "mak-cement", name: "МАК Цемент", verified: true, rating: 4.4, reviewCount: 87, cities: ["Улаанбаатар"] },
  { slug: "senko-cement", name: "Сенко Цемент ХХК", verified: false, rating: 4.1, reviewCount: 32, cities: ["Дархан", "Улаанбаатар"] },
  { slug: "knauf-mongol", name: "Knauf Монгол", verified: true, rating: 4.7, reviewCount: 91, cities: ["Улаанбаатар"] },
];

interface CategorySeed {
  slug: string;
  name: string;
  icon: string;
  attributes: { key: string; label: string; unit?: string; type?: AttributeType }[];
}

const CATEGORIES: CategorySeed[] = [
  {
    slug: "cement", name: "Цемент, бетон", icon: "cement",
    attributes: [
      { key: "grade", label: "Марк" },
      { key: "weight", label: "Жин", unit: "кг", type: AttributeType.NUMBER },
      { key: "strength", label: "Шахалтын бат бэх", unit: "МПа" },
      { key: "packaging", label: "Савлагаа" },
    ],
  },
  {
    slug: "brick", name: "Тоосго, блок", icon: "brick",
    attributes: [
      { key: "size", label: "Хэмжээ" },
      { key: "material", label: "Материал" },
      { key: "load", label: "Даац" },
      { key: "frost", label: "Хүйтэн тэсвэрлэлт" },
    ],
  },
  {
    slug: "rebar", name: "Арматур, төмөр", icon: "rebar",
    attributes: [
      { key: "diameter", label: "Диаметр", unit: "мм", type: AttributeType.NUMBER },
      { key: "steel", label: "Гангийн ангилал" },
      { key: "length", label: "Урт", unit: "м", type: AttributeType.NUMBER },
      { key: "surface", label: "Гадаргуу" },
    ],
  },
  {
    slug: "wood", name: "Модон материал", icon: "wood",
    attributes: [
      { key: "thickness", label: "Зузаан", unit: "мм", type: AttributeType.NUMBER },
      { key: "size", label: "Хэмжээ" },
      { key: "species", label: "Модны төрөл" },
      { key: "moisture", label: "Чийглэг" },
    ],
  },
  {
    slug: "roof", name: "Дээвэр", icon: "roof",
    attributes: [
      { key: "material", label: "Материал" },
      { key: "thickness", label: "Зузаан", unit: "мм" },
      { key: "coating", label: "Бүрэлт" },
      { key: "color", label: "Өнгө" },
    ],
  },
  {
    slug: "insulation", name: "Дулаалга", icon: "insulation",
    attributes: [
      { key: "thickness", label: "Зузаан", unit: "мм", type: AttributeType.NUMBER },
      { key: "density", label: "Нягт", unit: "кг/м³", type: AttributeType.NUMBER },
      { key: "conductivity", label: "Дулаан дамжуулалт", unit: "Вт/м·К" },
      { key: "fire", label: "Галд тэсвэрлэлт" },
    ],
  },
  {
    slug: "plumbing", name: "Сантехник", icon: "plumbing",
    attributes: [
      { key: "diameter", label: "Диаметр", unit: "мм" },
      { key: "material", label: "Материал" },
      { key: "pressure", label: "Даралт", unit: "атм" },
      { key: "usage", label: "Зориулалт" },
    ],
  },
  {
    slug: "electric", name: "Цахилгаан", icon: "electric",
    attributes: [
      { key: "section", label: "Хөндлөн огтлол", unit: "мм²" },
      { key: "voltage", label: "Хүчдэл", unit: "В" },
      { key: "cores", label: "Судлын тоо" },
      { key: "material", label: "Материал" },
    ],
  },
  {
    slug: "paint", name: "Будгийн материал", icon: "paint",
    attributes: [
      { key: "volume", label: "Эзэлхүүн", unit: "л", type: AttributeType.NUMBER },
      { key: "base", label: "Суурь" },
      { key: "coverage", label: "Зарцуулалт", unit: "м²/л" },
      { key: "usage", label: "Зориулалт" },
    ],
  },
  {
    slug: "tools", name: "Багаж", icon: "tools",
    attributes: [
      { key: "power", label: "Хүчин чадал", unit: "Вт" },
      { key: "voltage", label: "Хүчдэл", unit: "В" },
      { key: "brand", label: "Үйлдвэрлэгч" },
      { key: "warranty", label: "Баталгаат хугацаа" },
    ],
  },
];

interface ProductSeed {
  slug: string;
  name: string;
  variantLabel?: string;
  category: string;
  art: string;
  manufacturer: string;
  basePrice: number;
  unit: string;
  standard: string;
  summary: string;
  usage: string[];
  attributes: Record<string, string>;
  suppliers: string[];
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: "portland-cement-m400", name: "Портланд цемент М400", variantLabel: "50 кг",
    category: "cement", art: "cement", manufacturer: "Монцемент", basePrice: 24900, unit: "ш",
    standard: "MNS 974:2008",
    summary: "Барилгын суурь, хучилт, өрлөгийн зуурмагт өргөн хэрэглэгддэг портланд цемент.",
    usage: ["Суурь, тулгуур багана, хучилтын бетон", "Өрлөг, шаваасны зуурмаг", "Хуурай, сэрүүн агуулахад хадгална"],
    attributes: { grade: "М400 (CEM II 32.5)", weight: "50", strength: "40", packaging: "Гурван давхар цаасан шуудай" },
    suppliers: ["montsement", "khass", "mak-cement", "senko-cement"],
  },
  {
    slug: "portland-cement-m500", name: "Портланд цемент М500", variantLabel: "50 кг",
    category: "cement", art: "cement", manufacturer: "Хасс", basePrice: 28400, unit: "ш",
    standard: "MNS 974:2008",
    summary: "Өндөр бат бэхийн М500 марк. Даацын бүтээц, урьдчилан хийцэд тохиромжтой.",
    usage: ["Даацын бүтээц", "Урьдчилан хийсэн бетон эдлэл", "Хүнд ачааллын хучилт"],
    attributes: { grade: "М500 (CEM I 42.5)", weight: "50", strength: "50", packaging: "Цаасан шуудай" },
    suppliers: ["khass", "montsement", "mak-cement"],
  },
  {
    slug: "ready-mix-concrete-b25", name: "Бэлэн бетон B25", variantLabel: "1 м³",
    category: "cement", art: "cement", manufacturer: "Барилга Эко", basePrice: 385000, unit: "м³",
    standard: "MNS 3251:2016",
    summary: "Автомиксерээр хүргэгддэг бэлэн бетон. Суурь, хучилтад бэлэн хэлбэрээр нийлүүлнэ.",
    usage: ["Суурь цутгалт", "Хучилт", "Талбайн бетондолт"],
    attributes: { grade: "B25 (M350)", weight: "2400", strength: "25", packaging: "Автомиксер" },
    suppliers: ["barilga-eco", "altan-group"],
  },
  {
    slug: "cement-mortar-m150", name: "Өрлөгийн зуурмаг М150", variantLabel: "25 кг",
    category: "cement", art: "cement", manufacturer: "Knauf", basePrice: 12400, unit: "ш",
    standard: "MNS EN 998-2",
    summary: "Бэлэн хуурай зуурмаг. Ус нэмээд шууд ашиглана.",
    usage: ["Тоосгоны өрлөг", "Блокны өрлөг", "Шавардлага"],
    attributes: { grade: "М150", weight: "25", strength: "15", packaging: "Цаасан шуудай" },
    suppliers: ["knauf-mongol", "altan-group", "stroy-market"],
  },

  {
    slug: "red-brick", name: "Улаан тоосго",
    category: "brick", art: "brick", manufacturer: "Барилга Эко", basePrice: 850, unit: "ш",
    standard: "MNS 0072:2015",
    summary: "Шатаасан улаан шавар тоосго. Дулаан тусгаарлалт сайтай.",
    usage: ["Гадна фасадны өрлөг", "Дотор таслах хана", "Зуух, яндангийн өрлөг"],
    attributes: { size: "250x120x65 мм", material: "Шатаасан шавар", load: "M150", frost: "F50" },
    suppliers: ["barilga-eco", "altan-group", "stroy-market"],
  },
  {
    slug: "aerated-block-600", name: "Хийт блок 600x200x300",
    category: "brick", art: "aerated-block", manufacturer: "Аэроблок", basePrice: 3500, unit: "ш",
    standard: "MNS EN 771-4",
    summary: "Автоклавын хийт бетон блок. Хөнгөн жинтэй, дулаан алдагдал багатай.",
    usage: ["Даацгүй болон даацтай хана", "Дулаалгын нэмэлт давхарга", "Цавуун зуурмагтай өрнө"],
    attributes: { size: "600x200x300 мм", material: "Автоклавын хийт бетон D500", load: "B2.5", frost: "F35" },
    suppliers: ["aeroblock", "altan-group", "stroy-market"],
  },
  {
    slug: "concrete-block-390", name: "Бетон блок 390x190x190",
    category: "brick", art: "aerated-block", manufacturer: "Алтан Групп", basePrice: 2400, unit: "ш",
    standard: "MNS 1105:2013",
    summary: "Даацын хананд зориулсан хөндий бетон блок.",
    usage: ["Даацын хана", "Хашаа, суурь", "Подвалын хана"],
    attributes: { size: "390x190x190 мм", material: "Хүнд бетон", load: "M100", frost: "F50" },
    suppliers: ["altan-group", "barilga-eco"],
  },
  {
    slug: "facade-brick", name: "Фасадны тоосго",
    category: "brick", art: "brick", manufacturer: "Барилга Эко", basePrice: 1450, unit: "ш",
    standard: "MNS 0072:2015",
    summary: "Гадна засалд зориулсан гөлгөр гадаргуутай өнгөт тоосго.",
    usage: ["Фасадны засал", "Хашлага", "Дотор чимэглэл"],
    attributes: { size: "250x120x65 мм", material: "Шатаасан шавар", load: "M200", frost: "F75" },
    suppliers: ["barilga-eco", "stroy-market"],
  },

  {
    slug: "rebar-a500c-12", name: "Арматур A500C 12мм",
    category: "rebar", art: "rebar", manufacturer: "Ган Трейд", basePrice: 3850, unit: "м",
    standard: "MNS 4235:2016",
    summary: "Хавирган гадаргуутай A500C ангиллын арматур.",
    usage: ["Суурь, багана, дам нурууны арматурчлал", "Хучилтын тор", "Гагнуурын аргаар холбож болно"],
    attributes: { diameter: "12", steel: "A500C", length: "11.7", surface: "Хавирган" },
    suppliers: ["gan-trade", "altan-group", "stroy-market"],
  },
  {
    slug: "rebar-a500c-16", name: "Арматур A500C 16мм",
    category: "rebar", art: "rebar", manufacturer: "Ган Трейд", basePrice: 6900, unit: "м",
    standard: "MNS 4235:2016",
    summary: "Даацын бүтээцэд хэрэглэх 16мм диаметртэй арматур.",
    usage: ["Багана, дам нуруу", "Суурийн арматурчлал", "Даацын хана"],
    attributes: { diameter: "16", steel: "A500C", length: "11.7", surface: "Хавирган" },
    suppliers: ["gan-trade", "altan-group"],
  },
  {
    slug: "steel-pipe-50", name: "Профайл хоолой 50x50x2",
    category: "rebar", art: "rebar", manufacturer: "Ган Трейд", basePrice: 8900, unit: "м",
    standard: "MNS GOST 8639",
    summary: "Дөрвөлжин хөндлөн огтлолтой хийцийн хоолой.",
    usage: ["Каркас", "Хашаа", "Дээврийн бүтээц"],
    attributes: { diameter: "50x50 мм", steel: "Ст3", length: "6", surface: "Гөлгөр" },
    suppliers: ["gan-trade", "stroy-market"],
  },
  {
    slug: "welded-mesh-100", name: "Гагнасан тор 100x100x4",
    category: "rebar", art: "rebar", manufacturer: "Алтан Групп", basePrice: 42000, unit: "ш",
    standard: "MNS GOST 23279",
    summary: "Хучилт, шалны бетонд ашиглах бэлэн гагнасан тор.",
    usage: ["Шалны бетон", "Хучилт", "Замын хучилт"],
    attributes: { diameter: "4", steel: "Вр-1", length: "2x3 м", surface: "Гөлгөр" },
    suppliers: ["altan-group", "gan-trade"],
  },

  {
    slug: "plywood-18", name: "Фанер хавтан 18мм",
    category: "wood", art: "plywood", manufacturer: "Вүүд Монгол", basePrice: 28500, unit: "ш",
    standard: "MNS GOST 3916.1",
    summary: "Хус модны нимгэн давхаргаар нааж хийсэн хавтан.",
    usage: ["Бетоны хэв", "Тавилгын суурь", "Шалны доод давхарга"],
    attributes: { thickness: "18", size: "1220x2440 мм", species: "Хус", moisture: "8-10%" },
    suppliers: ["wood-mongol", "altan-group"],
  },
  {
    slug: "osb-9", name: "OSB хавтан 9мм",
    category: "wood", art: "plywood", manufacturer: "Вүүд Монгол", basePrice: 19800, unit: "ш",
    standard: "MNS EN 300",
    summary: "Чиглүүлсэн үртсэн хавтан. Хана, дээврийн бүрхүүлд тохиромжтой.",
    usage: ["Каркасан ханын бүрхүүл", "Дээврийн суурь", "Түр хашлага"],
    attributes: { thickness: "9", size: "1220x2440 мм", species: "Нарс", moisture: "8%" },
    suppliers: ["wood-mongol", "stroy-market"],
  },
  {
    slug: "lumber-50x150", name: "Зүсмэл материал 50x150",
    category: "wood", art: "plywood", manufacturer: "Вүүд Монгол", basePrice: 14500, unit: "м",
    standard: "MNS 0079:2018",
    summary: "Нарсан зүсмэл материал. Каркас, дам нуруунд хэрэглэнэ.",
    usage: ["Дээврийн каркас", "Хана, таазны мод", "Түр байгууламж"],
    attributes: { thickness: "50", size: "50x150 мм", species: "Нарс", moisture: "12-14%" },
    suppliers: ["wood-mongol", "altan-group", "stroy-market"],
  },

  {
    slug: "metal-roof-sheet", name: "Металл ваар дээвэр",
    category: "roof", art: "plywood", manufacturer: "Хасс", basePrice: 32000, unit: "м²",
    standard: "MNS EN 508-1",
    summary: "Полимер бүрэлттэй хөнгөн металл дээврийн хучилт.",
    usage: ["Орон сууцны дээвэр", "Агуулах, амбаар", "Сэргээн засварлалт"],
    attributes: { material: "Гальванитлагдсан ган", thickness: "0.45", coating: "Полиэстер", color: "Улаан, хүрэн, ногоон" },
    suppliers: ["khass", "altan-group"],
  },
  {
    slug: "profile-sheet-c21", name: "Профиль хавтан C21",
    category: "roof", art: "plywood", manufacturer: "Алтан Групп", basePrice: 24500, unit: "м²",
    standard: "MNS GOST 24045",
    summary: "Дээвэр, хашаанд хэрэглэх долгионтой профиль хавтан.",
    usage: ["Дээвэр", "Хашаа", "Ханын бүрхүүл"],
    attributes: { material: "Ган", thickness: "0.4", coating: "Цайрдмал", color: "Цагаан, саарал" },
    suppliers: ["altan-group", "stroy-market", "khass"],
  },
  {
    slug: "bitumen-membrane", name: "Битум гидроизоляц",
    category: "roof", art: "insulation", manufacturer: "Изовер Монгол", basePrice: 96000, unit: "рулон",
    standard: "MNS EN 13707",
    summary: "Хавтгай дээвэр, суурийн ус тусгаарлагч битум материал.",
    usage: ["Хавтгай дээвэр", "Суурийн ус тусгаарлалт", "Подвал"],
    attributes: { material: "Битум-полимер", thickness: "4", coating: "Хайрган", color: "Хар" },
    suppliers: ["isover-mongol", "knauf-mongol"],
  },

  {
    slug: "mineral-wool-50", name: "Чулуун хөвөн дулаалга 50мм",
    category: "insulation", art: "insulation", manufacturer: "Изовер", basePrice: 12900, unit: "м²",
    standard: "MNS EN 13162",
    summary: "Базальт чулуун хөвөн дулаалга. Шатдаггүй, дуу тусгаарлалт сайтай.",
    usage: ["Хөнгөн каркасан ханын дулаалга", "Дээвэр, дээвэр доорх орон зай", "Уур тусгаарлагчтай хамт"],
    attributes: { thickness: "50", density: "50", conductivity: "0.035", fire: "A1 (шатдаггүй)" },
    suppliers: ["isover-mongol", "knauf-mongol", "stroy-market"],
  },
  {
    slug: "mineral-wool-100", name: "Чулуун хөвөн дулаалга 100мм",
    category: "insulation", art: "insulation", manufacturer: "Изовер", basePrice: 23800, unit: "м²",
    standard: "MNS EN 13162",
    summary: "100мм зузаантай базальт хөвөн. Хүйтэн бүсийн ханын дулаалгад.",
    usage: ["Гадна ханын дулаалга", "Дээврийн дулаалга", "Технологийн дулаалга"],
    attributes: { thickness: "100", density: "50", conductivity: "0.035", fire: "A1 (шатдаггүй)" },
    suppliers: ["isover-mongol", "knauf-mongol"],
  },
  {
    slug: "eps-foam-50", name: "Хөөсөнцөр дулаалга 50мм",
    category: "insulation", art: "insulation", manufacturer: "Барилга Эко", basePrice: 8400, unit: "м²",
    standard: "MNS EN 13163",
    summary: "Хөнгөн, хямд өртөгтэй хөөсөнцөр дулаалга.",
    usage: ["Суурийн дулаалга", "Шалны дулаалга", "Фасадны дулаалга"],
    attributes: { thickness: "50", density: "25", conductivity: "0.038", fire: "G3" },
    suppliers: ["barilga-eco", "stroy-market", "altan-group"],
  },

  {
    slug: "ppr-pipe-25", name: "PPR хоолой 25мм",
    category: "plumbing", art: "rebar", manufacturer: "Knauf", basePrice: 4900, unit: "м",
    standard: "MNS EN ISO 15874",
    summary: "Халуун хүйтэн усанд хэрэглэх полипропилен хоолой.",
    usage: ["Дотор ус хангамж", "Халаалтын шугам", "Сантехникийн угсралт"],
    attributes: { diameter: "25", material: "PPR", pressure: "20", usage: "Халуун, хүйтэн ус" },
    suppliers: ["knauf-mongol", "stroy-market", "altan-group"],
  },
  {
    slug: "pvc-drain-110", name: "PVC бохирын хоолой 110мм",
    category: "plumbing", art: "rebar", manufacturer: "Алтан Групп", basePrice: 12800, unit: "м",
    standard: "MNS EN 1329-1",
    summary: "Бохир ус зайлуулах PVC хоолой.",
    usage: ["Дотор бохир ус", "Гадна шугам", "Салаа холболт"],
    attributes: { diameter: "110", material: "PVC", pressure: "6", usage: "Бохир ус" },
    suppliers: ["altan-group", "stroy-market"],
  },
  {
    slug: "water-heater-80", name: "Ус халаагуур 80л",
    category: "plumbing", art: "rebar", manufacturer: "Хасс", basePrice: 685000, unit: "ш",
    standard: "MNS IEC 60335",
    summary: "Хуримтлуулах төрлийн цахилгаан ус халаагуур.",
    usage: ["Орон сууц", "Зуслангийн байшин", "Оффис"],
    attributes: { diameter: "80 л", material: "Паалантай ган", pressure: "8", usage: "Ахуйн халуун ус" },
    suppliers: ["khass", "altan-group"],
  },

  {
    slug: "cable-vvg-3x2-5", name: "Кабель ВВГ 3x2.5",
    category: "electric", art: "rebar", manufacturer: "Ган Трейд", basePrice: 5600, unit: "м",
    standard: "MNS GOST 16442",
    summary: "Зэс судалтай, PVC тусгаарлагчтай хүчний кабель.",
    usage: ["Гэрэлтүүлгийн шугам", "Розеткийн шугам", "Дотор угсралт"],
    attributes: { section: "2.5", voltage: "660", cores: "3", material: "Зэс" },
    suppliers: ["gan-trade", "stroy-market", "altan-group"],
  },
  {
    slug: "breaker-c25", name: "Автомат таслуур C25",
    category: "electric", art: "rebar", manufacturer: "Хасс", basePrice: 24500, unit: "ш",
    standard: "MNS IEC 60898",
    summary: "Нэг фазын хэлхээ хамгаалах автомат таслуур.",
    usage: ["Хуваарилах самбар", "Орон сууцны хэлхээ", "Оффисын хэлхээ"],
    attributes: { section: "25 A", voltage: "230", cores: "1", material: "Полиамид корпус" },
    suppliers: ["khass", "altan-group"],
  },
  {
    slug: "led-panel-40w", name: "LED гэрэл 40Вт",
    category: "electric", art: "rebar", manufacturer: "Хитачи", basePrice: 68000, unit: "ш",
    standard: "MNS IEC 62722",
    summary: "Оффис, дэлгүүрийн таазны LED панель гэрэл.",
    usage: ["Оффисын гэрэлтүүлэг", "Дэлгүүр", "Агуулах"],
    attributes: { section: "40 Вт", voltage: "220", cores: "-", material: "Хөнгөн цагаан" },
    suppliers: ["khass", "stroy-market"],
  },

  {
    slug: "facade-paint-10l", name: "Фасадны будаг 10л",
    category: "paint", art: "insulation", manufacturer: "Knauf", basePrice: 128000, unit: "ш",
    standard: "MNS EN 1062",
    summary: "Гадна фасадны цаг агаарт тэсвэртэй акрилан будаг.",
    usage: ["Гадна хана", "Фасад", "Бетон гадаргуу"],
    attributes: { volume: "10", base: "Акрил", coverage: "8", usage: "Гадна" },
    suppliers: ["knauf-mongol", "altan-group"],
  },
  {
    slug: "interior-paint-10l", name: "Дотор будаг 10л",
    category: "paint", art: "insulation", manufacturer: "Knauf", basePrice: 94000, unit: "ш",
    standard: "MNS EN 13300",
    summary: "Үнэргүй, хурдан хатдаг усан суурьтай дотор засалын будаг.",
    usage: ["Дотор хана", "Тааз", "Гипсэн хавтан"],
    attributes: { volume: "10", base: "Усан суурьтай", coverage: "10", usage: "Дотор" },
    suppliers: ["knauf-mongol", "stroy-market", "altan-group"],
  },
  {
    slug: "putty-25kg", name: "Шпаклёвк 25кг",
    category: "paint", art: "cement", manufacturer: "Knauf", basePrice: 32000, unit: "ш",
    standard: "MNS EN 13279",
    summary: "Гипсэн суурьтай гөлгөрүүлэх шпаклёвк.",
    usage: ["Ханын гөлгөрүүлэлт", "Гипсэн хавтангийн уулзвар", "Будгийн бэлтгэл"],
    attributes: { volume: "25 кг", base: "Гипс", coverage: "1.2 кг/м²", usage: "Дотор" },
    suppliers: ["knauf-mongol", "altan-group"],
  },

  {
    slug: "drill-800w", name: "Цахилгаан өрөм 800Вт",
    category: "tools", art: "rebar", manufacturer: "Хитачи", basePrice: 285000, unit: "ш",
    standard: "MNS IEC 62841",
    summary: "Цохилттой горимтой мэргэжлийн цахилгаан өрөм.",
    usage: ["Бетон, тоосго өрөмдөх", "Мод, металл", "Барилгын угсралт"],
    attributes: { power: "800", voltage: "220", brand: "Хитачи", warranty: "24 сар" },
    suppliers: ["stroy-market", "altan-group"],
  },
  {
    slug: "angle-grinder-125", name: "Өнцөг зүлгүүр 125мм",
    category: "tools", art: "rebar", manufacturer: "Хитачи", basePrice: 198000, unit: "ш",
    standard: "MNS IEC 62841",
    summary: "125мм дискний өнцөг зүлгүүр.",
    usage: ["Металл зүсэх", "Бетон зүсэх", "Гадаргуу цэвэрлэх"],
    attributes: { power: "900", voltage: "220", brand: "Хитачи", warranty: "24 сар" },
    suppliers: ["stroy-market", "altan-group", "gan-trade"],
  },
  {
    slug: "laser-level", name: "Лазер түвшин",
    category: "tools", art: "rebar", manufacturer: "Хитачи", basePrice: 420000, unit: "ш",
    standard: "MNS IEC 60825",
    summary: "Хөндлөн, босоо шугам гаргах өөрөө тэгшлэгддэг лазер түвшин.",
    usage: ["Хана, таазны түвшин", "Тавилга угсралт", "Плита наалт"],
    attributes: { power: "-", voltage: "3.7 (Li-ion)", brand: "Хитачи", warranty: "12 сар" },
    suppliers: ["stroy-market", "altan-group"],
  },
];

/** Тодорхой хүрээнд давтагдашгүй тоо гаргах энгийн жигд тархалт */
const vary = (base: number, index: number): number => {
  const factor = 1 + (index * 7 % 23) / 100; // 0% – 22%
  return Math.round((base * factor) / 100) * 100;
};

/**
 * Демо каталог (33 зохиомол бараа, тэдгээрийн санал, үлдэгдэл, үнэлгээ) нь
 * зөвхөн `--demo` тугтай үед үүснэ. Бодит каталогийг `db:import:barilga`
 * оруулдаг тул анхдагчаар seed нь зөвхөн ангилал, нийлүүлэгч, хэрэглэгч,
 * урамшуулал, баннерыг л бэлтгэнэ.
 */
const withDemoCatalog = process.argv.includes("--demo");

async function main() {
  console.log("Хуучин өгөгдлийг цэвэрлэж байна...");
  await prisma.$transaction([
    prisma.commissionLedger.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.supplierOrder.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.attributeValue.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.review.deleteMany(),
    prisma.product.deleteMany(),
    prisma.attribute.deleteMany(),
    prisma.category.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.supplierBankAccount.deleteMany(),
    prisma.user.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  console.log("Ангилал, үзүүлэлт...");
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const created = await prisma.category.create({
      data: {
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        position: index,
        attributes: {
          create: category.attributes.map((attribute, position) => ({
            key: attribute.key,
            label: attribute.label,
            unit: attribute.unit,
            type: attribute.type ?? AttributeType.TEXT,
            position,
          })),
        },
      },
    });
    categoryIds.set(category.slug, created.id);
  }

  console.log("Нийлүүлэгч, агуулах...");
  const supplierIds = new Map<string, string>();
  const warehouseIds = new Map<string, string>(); // `${supplierSlug}:${city}` -> id
  for (const supplier of SUPPLIERS) {
    const created = await prisma.supplier.create({
      data: {
        slug: supplier.slug,
        name: supplier.name,
        verified: supplier.verified,
        rating: supplier.rating,
        reviewCount: supplier.reviewCount,
        regNo: String(2000000 + supplier.slug.length * 13457),
        description: `${supplier.name} — барилгын материалын нийлүүлэгч.`,
      },
    });
    supplierIds.set(supplier.slug, created.id);

    for (const city of supplier.cities) {
      const point = scatter(city, `${supplier.slug}:${city}`);
      const warehouse = await prisma.warehouse.create({
        data: {
          supplierId: created.id,
          name: `${city} төв агуулах`,
          city,
          address: `${city}, Барилгын материалын салбар`,
          lat: point.lat,
          lng: point.lng,
        },
      });
      warehouseIds.set(`${supplier.slug}:${city}`, warehouse.id);
    }

    // Татан авалтад ашиглах дансны мэдээлэл
    await prisma.supplierBankAccount.create({
      data: {
        supplierId: created.id,
        bankName: "Хаан банк",
        accountNo: String(5000000000 + supplier.slug.length * 71).slice(0, 10),
        accountName: supplier.name,
      },
    });
  }

  console.log(
    withDemoCatalog
      ? "Демо бүтээгдэхүүн, санал, үлдэгдэл..."
      : "Демо каталог алгаслаа (--demo тугаар үүсгэнэ).",
  );
  let offerCount = 0;
  const demoProducts: ProductSeed[] = withDemoCatalog ? PRODUCTS : [];
  for (const [productIndex, product] of demoProducts.entries()) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Ангилал олдсонгүй: ${product.category}`);

    const attributes = await prisma.attribute.findMany({ where: { categoryId } });
    const created = await prisma.product.create({
      data: {
        slug: product.slug,
        name: product.name,
        variantLabel: product.variantLabel,
        categoryId,
        manufacturer: product.manufacturer,
        art: product.art,
        summary: product.summary,
        standard: product.standard,
        usage: product.usage,
        attributes: {
          create: attributes
            .filter((attribute) => product.attributes[attribute.key] !== undefined)
            .map((attribute) => ({
              attributeId: attribute.id,
              value: product.attributes[attribute.key],
            })),
        },
      },
    });

    for (const [supplierIndex, supplierSlug] of product.suppliers.entries()) {
      const supplierId = supplierIds.get(supplierSlug);
      const supplier = SUPPLIERS.find((s) => s.slug === supplierSlug);
      if (!supplierId || !supplier) continue;

      const price = vary(product.basePrice, productIndex + supplierIndex * 3);
      const bulk = supplierIndex % 2 === 0 ? Math.round((price * 0.96) / 100) * 100 : null;
      const offer = await prisma.offer.create({
        data: {
          productId: created.id,
          supplierId,
          price,
          bulkPrice: bulk,
          bulkMinQty: bulk ? [50, 100, 200, 500][(productIndex + supplierIndex) % 4] : null,
          unit: product.unit,
          deliveryPrice: [0, 12000, 15000, 18000, 25000][(productIndex + supplierIndex) % 5],
          deliveryDays: 1 + ((productIndex + supplierIndex) % 3),
          deliversTo: supplier.cities.includes("Улаанбаатар")
            ? supplier.cities
            : [...supplier.cities, "Улаанбаатар"],
        },
      });
      offerCount += 1;

      for (const city of supplier.cities) {
        const warehouseId = warehouseIds.get(`${supplierSlug}:${city}`);
        if (!warehouseId) continue;
        await prisma.inventory.create({
          data: {
            offerId: offer.id,
            warehouseId,
            quantity: 200 + ((productIndex * 137 + supplierIndex * 61) % 4000),
          },
        });
      }
    }
  }

  console.log("Хэрэглэгч...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const organization = await prisma.organization.create({
    data: {
      name: "Эрчим Барилга ХХК",
      regNo: "5412345",
      phone: "70112233",
      address: "Улаанбаатар, ХУД, 3-р хороо",
    },
  });

  await prisma.user.create({
    data: { email: "admin@100ail.mn", name: "Системийн админ", passwordHash, role: UserRole.ADMIN, phone: "99000000" },
  });
  await prisma.user.create({
    data: { email: "buyer@100ail.mn", name: "Б. Ганбаатар", passwordHash, role: UserRole.BUYER, phone: "99112233" },
  });
  await prisma.user.create({
    data: {
      email: "company@100ail.mn", name: "Д. Оюунаа", passwordHash, role: UserRole.BUYER,
      phone: "99223344", organizationId: organization.id,
    },
  });
  for (const [index, slug] of [
    "montsement",
    "barilga-eco",
    "gan-trade",
    "altan-group",
  ].entries()) {
    const supplier = SUPPLIERS.find((s) => s.slug === slug);
    await prisma.user.create({
      data: {
        email: `${slug}@100ail.mn`,
        name: `${supplier?.name} менежер`,
        passwordHash,
        role: UserRole.SUPPLIER,
        supplierId: supplierIds.get(slug),
        // Утсаар нэвтрэх боломжтой тул нийлүүлэгч бүрд өөр дугаар
        phone: `9933445${index + 1}`,
      },
    });
  }

  console.log("Үнэлгээ, урамшуулал...");
  const cementProduct = await prisma.product.findUnique({ where: { slug: "portland-cement-m400" } });
  const brickProduct = await prisma.product.findUnique({ where: { slug: "red-brick" } });
  const rebarProduct = await prisma.product.findUnique({ where: { slug: "rebar-a500c-12" } });
  if (cementProduct && brickProduct && rebarProduct) {
    await prisma.review.createMany({
      data: [
        { productId: cementProduct.id, supplierId: supplierIds.get("montsement")!, authorName: "Б. Ганбаатар", rating: 5, text: "60 шуудай захиалсан, маргааш нь хүргэсэн. Шуудай урагдаагүй, чанар сайн." },
        { productId: cementProduct.id, supplierId: supplierIds.get("khass")!, authorName: "Д. Оюунаа", rating: 4, text: "Үнэ бага зэрэг өндөр ч бөөний хямдрал сайн. Хүргэлт цагтаа ирсэн." },
        { productId: brickProduct.id, supplierId: supplierIds.get("barilga-eco")!, authorName: "С. Мөнхбат", rating: 5, text: "5000 ширхэг авсан, хагарсан нь 20-оос хэтрээгүй. Дахин захиална." },
        { productId: rebarProduct.id, supplierId: supplierIds.get("gan-trade")!, authorName: "Ч. Батсайхан", rating: 5, text: "Гэрчилгээтэй, жин нь стандартад тохирсон. Хэмжилт зөрөөгүй." },
      ],
    });
  }

  await prisma.promotion.createMany({
    data: [
      {
        code: "BARILGA10", title: "Барилгын улирлын хямдрал", description: "Цемент, тоосгоны захиалгад 10% хөнгөлөлт",
        percentOff: 10, startsAt: new Date("2026-05-01"), endsAt: new Date("2026-10-01"),
      },
      {
        code: "FREEDELIVERY", title: "Үнэгүй хүргэлт", description: "1 сая төгрөгөөс дээш захиалгад УБ хотод үнэгүй хүргэнэ",
        amountOff: 25000, startsAt: new Date("2026-01-01"), endsAt: new Date("2026-12-31"),
      },
    ],
  });

  await prisma.banner.createMany({
    data: [
      {
        title: "Барилгын улирал нээлттэй",
        subtitle: "Цемент, тоосго, арматурын үнийг 12 нийлүүлэгчээс шууд харьцуулаарай",
        linkUrl: "/?category=tsement",
        placement: BannerPlacement.HOME_HERO,
        position: 0,
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-12-31"),
      },
      {
        title: "Бөөний захиалгад тусгай үнэ",
        subtitle: "100 шуудайнаас дээш захиалгад бөөний үнэ автоматаар тооцогдоно",
        linkUrl: "/?sort=price",
        placement: BannerPlacement.HOME_HERO,
        position: 1,
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-12-31"),
      },
      {
        title: "Баталгаажсан нийлүүлэгчид",
        subtitle: "Гэрчилгээ, тайлан шалгагдсан 12 компани",
        linkUrl: "/",
        placement: BannerPlacement.HOME_STRIP,
        position: 0,
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-12-31"),
      },
    ],
  });

  const counts = {
    ангилал: await prisma.category.count(),
    үзүүлэлт: await prisma.attribute.count(),
    бүтээгдэхүүн: await prisma.product.count(),
    санал: offerCount,
    нийлүүлэгч: await prisma.supplier.count(),
    агуулах: await prisma.warehouse.count(),
    үлдэгдэл: await prisma.inventory.count(),
    хэрэглэгч: await prisma.user.count(),
    баннер: await prisma.banner.count(),
  };
  console.log("Seed дууслаа:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

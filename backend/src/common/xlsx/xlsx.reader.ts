import { inflateRawSync } from "node:zlib";

/**
 * Excel (.xlsx) ба CSV файлыг гуравдагч сангүйгээр уншина.
 *
 * .xlsx нь ZIP архив тул төв каталогийг задлаад `xl/worksheets/sheet1.xml`
 * болон `xl/sharedStrings.xml`-ийг Node-ийн `zlib.inflateRawSync`-ээр
 * задалж, нүднүүдийг мөр багана болгон буулгана. Ингэснээр нийлүүлэгч
 * Excel-ээс шууд файлаа оруулах боломжтой (баримтын 4.2-р хэсэг).
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

/** ZIP архивын төв каталогийг уншиж, файл бүрийн байрлалыг олно */
function readZipEntries(buffer: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>();

  // EOCD бичлэгийг араас нь хайна (сүүлийн 64KB коммент хүртэл)
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP бүтэц олдсонгүй — Excel файл мөн эсэхийг шалгана уу");

  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);

  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) break;

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    entries.set(name, { name, method, compressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/** Архивын нэг файлын агуулгыг задлана */
function readZipFile(buffer: Buffer, entry: ZipEntry): string {
  if (buffer.readUInt32LE(entry.localOffset) !== LOCAL_SIGNATURE) {
    throw new Error(`ZIP бичлэг эвдэрсэн: ${entry.name}`);
  }

  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const data = buffer.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) return inflateRawSync(data).toString("utf8");
  throw new Error(`Дэмжигдээгүй шахалт: ${entry.method}`);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const decodeXml = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });

/** `<si>` бүрийн бүх `<t>` хэсгийг нийлүүлж хуваалцсан мөрийн жагсаалт үүсгэнэ */
function readSharedStrings(xml: string): string[] {
  const items: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
      (part) => decodeXml(part[1]),
    );
    items.push(parts.join(""));
  }
  return items;
}

/** "BC12" -> 54 (0-оос эхэлсэн баганын дугаар) */
function columnIndex(reference: string): number {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return Math.max(0, index - 1);
}

function readSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attributes = cellMatch[1] ?? "";
      const content = cellMatch[2] ?? "";
      const reference = /r="([A-Z]+\d+)"/i.exec(attributes)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attributes)?.[1] ?? "n";
      const index = reference ? columnIndex(reference) : cells.length;

      let value = "";
      if (type === "inlineStr") {
        value = [...content.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
          .map((part) => decodeXml(part[1]))
          .join("");
      } else {
        const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(content)?.[1] ?? "";
        if (type === "s") value = shared[Number(raw)] ?? "";
        else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
        else value = decodeXml(raw);
      }

      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }

    rows.push(cells);
  }

  return rows;
}

/** Excel файлын эхний хуудсыг мөр багана болгон уншина */
export function readXlsx(buffer: Buffer): string[][] {
  const entries = readZipEntries(buffer);

  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const shared = sharedEntry ? readSharedStrings(readZipFile(buffer, sharedEntry)) : [];

  const sheetName =
    [...entries.keys()]
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .sort()[0] ?? null;
  if (!sheetName) throw new Error("Excel файлд ажлын хуудас олдсонгүй");

  return readSheet(readZipFile(buffer, entries.get(sheetName) as ZipEntry), shared);
}

/** Хашилт, мөр таслалыг зөв боловсруулдаг CSV задлагч */
export function readCsv(text: string, separator = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  const source = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === separator) pushCell();
    else if (char === "\n") pushRow();
    else cell += char;
  }

  if (cell.length > 0 || row.length > 0) pushRow();
  return rows.filter((line) => line.some((value) => value.length > 0));
}

/**
 * Файлын төрлийг агуулгаас нь таньж (ZIP толгойтой бол Excel) мөр
 * багана болгон буулгана. Хоосон мөрүүдийг хасна.
 */
export function readSpreadsheet(buffer: Buffer): string[][] {
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  const rows = isZip
    ? readXlsx(buffer)
    : readCsv(buffer.toString("utf8"), detectSeparator(buffer.toString("utf8")));
  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

/** Таб эсвэл цэгтэй таслалаар тусгаарласан файлыг ч дэмжинэ */
function detectSeparator(text: string): string {
  const line = text.split("\n").find((row) => row.trim().length > 0) ?? "";
  const counts = [
    [",", (line.match(/,/g) ?? []).length],
    [";", (line.match(/;/g) ?? []).length],
    ["\t", (line.match(/\t/g) ?? []).length],
  ] as const;
  return counts.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

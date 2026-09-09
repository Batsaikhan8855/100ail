import { deflateRawSync } from "node:zlib";
import { readCsv, readSpreadsheet, readXlsx } from "./xlsx.reader";

/** Туршилтад зориулж жижиг ZIP архив угсарна (шахсан болон шахаагүй) */
function buildZip(files: { name: string; content: string; deflate?: boolean }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const raw = Buffer.from(file.content, "utf8");
    const data = file.deflate ? deflateRawSync(raw) : raw;
    const method = file.deflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(Buffer.concat([local, name, data]));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));

    offset += 30 + name.length + data.length;
  }

  const body = Buffer.concat([...locals, ...centrals]);
  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([body, eocd]);
}

const SHARED_STRINGS = `<?xml version="1.0"?>
<sst><si><t>Барааны нэр</t></si><si><t>Үнэ</t></si><si><t>Портланд цемент</t></si>
<si><r><t>Ган </t></r><r><t>арматур</t></r></si></sst>`;

const SHEET = `<?xml version="1.0"?>
<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>24900</v></c></row>
<row r="3"><c r="A3" t="s"><v>3</v></c><c r="C3" t="inlineStr"><is><t>D10 &amp; D12</t></is></c></row>
</sheetData></worksheet>`;

describe("xlsx reader", () => {
  it("шахсан xlsx-ийн хуваалцсан мөр, тоо, inline утгыг уншина", () => {
    const buffer = buildZip([
      { name: "xl/sharedStrings.xml", content: SHARED_STRINGS, deflate: true },
      { name: "xl/worksheets/sheet1.xml", content: SHEET, deflate: true },
    ]);

    expect(readXlsx(buffer)).toEqual([
      ["Барааны нэр", "Үнэ"],
      ["Портланд цемент", "24900"],
      ["Ган арматур", "", "D10 & D12"],
    ]);
  });

  it("шахаагүй (stored) архивыг мөн уншина", () => {
    const buffer = buildZip([
      { name: "xl/sharedStrings.xml", content: SHARED_STRINGS },
      { name: "xl/worksheets/sheet1.xml", content: SHEET },
    ]);
    expect(readXlsx(buffer)[1]).toEqual(["Портланд цемент", "24900"]);
  });

  it("багана алгассан нүдийг зөв байрлалд тавина", () => {
    const sheet = `<worksheet><sheetData><row r="1">
      <c r="A1"><v>1</v></c><c r="D1"><v>4</v></c></row></sheetData></worksheet>`;
    const buffer = buildZip([{ name: "xl/worksheets/sheet1.xml", content: sheet }]);
    expect(readXlsx(buffer)).toEqual([["1", "", "", "4"]]);
  });

  it("Excel файл биш үед ойлгомжтой алдаа өгнө", () => {
    expect(() => readXlsx(Buffer.from("энэ бол зураг"))).toThrow(/ZIP бүтэц олдсонгүй/);
  });

  it("CSV-ийн хашилт, дотоод таслал, мөр таслалыг задална", () => {
    const csv = 'код,нэр,үнэ\r\nA1,"Цемент, 50кг",24900\r\nA2,"15"" хоолой",8000\n';
    expect(readCsv(csv)).toEqual([
      ["код", "нэр", "үнэ"],
      ["A1", "Цемент, 50кг", "24900"],
      ["A2", '15" хоолой', "8000"],
    ]);
  });

  it("төрлийг агуулгаас нь таньж, цэгтэй таслалыг дэмжинэ", () => {
    const rows = readSpreadsheet(Buffer.from("код;үнэ\nA1;1000\n", "utf8"));
    expect(rows).toEqual([
      ["код", "үнэ"],
      ["A1", "1000"],
    ]);
  });
});

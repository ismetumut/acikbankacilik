/**
 * Dolu Netekstre başvuru formu üretici — sıfırdan iyi biçimli OOXML (.docx) kurar.
 * Şablon dosyası GEREKMEZ; XML tamamen burada üretildiği için "malformed xml" riski yoktur.
 * Tüm alanlar (firma, yetkili, kapsam, sağlayıcı IP'leri, KVKK) baştan doldurulur.
 */
import PizZip from "pizzip";

export interface FilledFormData {
  bankName: string;
  unvan: string;
  vergiNo: string;
  mersisNo: string;
  musteriNo: string;
  adres: string;
  yetkili: string;
  yetkiliUnvan: string;
  telefon: string;
  eposta: string;
  kep: string;
  teknikYetkili: string;
  teknikGsm: string;
  teknikEposta: string;
  kapsam: string;
  providerName: string;
  providerBrand: string;
  ips: string[];
}

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const dash = (s: string) => (s && s.trim() ? s : "—");

function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  const rpr: string[] = [];
  if (opts.bold) rpr.push("<w:b/>");
  if (opts.size) rpr.push(`<w:sz w:val="${opts.size * 2}"/>`);
  if (opts.color) rpr.push(`<w:color w:val="${opts.color}"/>`);
  const rPr = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; align?: string; after?: number } = {},
) {
  const ppr: string[] = [];
  if (opts.align) ppr.push(`<w:jc w:val="${opts.align}"/>`);
  ppr.push(`<w:spacing w:after="${opts.after ?? 80}" w:line="264" w:lineRule="auto"/>`);
  const pPr = `<w:pPr>${ppr.join("")}</w:pPr>`;
  const r = text === "" ? "" : run(text, opts);
  return `<w:p>${pPr}${r}</w:p>`;
}

function sectionTitle(text: string) {
  return `<w:p><w:pPr><w:spacing w:before="160" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C9A24A"/></w:pBdr></w:pPr>${run(
    text,
    { bold: true, size: 11, color: "1C1A15" },
  )}</w:p>`;
}

/** İki sütunlu etiket/değer tablosu. */
function kvTable(rows: [string, string][]) {
  const grid = `<w:tblGrid><w:gridCol w:w="3400"/><w:gridCol w:w="6200"/></w:tblGrid>`;
  const borders = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D8D4C8"/>`)
    .join("")}</w:tblBorders>`;
  const tblPr = `<w:tblPr><w:tblW w:w="9600" w:type="dxa"/>${borders}<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const trs = rows
    .map(([k, v]) => {
      const kc = `<w:tc><w:tcPr><w:tcW w:w="3400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F4F2EC"/><w:vAlign w:val="center"/></w:tcPr>${para(
        k,
        { bold: true, size: 9.5, after: 0 },
      )}</w:tc>`;
      const vc = `<w:tc><w:tcPr><w:tcW w:w="6200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${para(
        dash(v),
        { size: 10, after: 0 },
      )}</w:tc>`;
      return `<w:tr>${kc}${vc}</w:tr>`;
    })
    .join("");
  return `<w:tbl>${tblPr}${grid}${trs}</w:tbl>`;
}

/** Tek sütunlu IP tablosu (başlık + satırlar). */
function ipTable(ips: string[]) {
  const grid = `<w:tblGrid><w:gridCol w:w="9600"/></w:tblGrid>`;
  const borders = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D8D4C8"/>`)
    .join("")}</w:tblBorders>`;
  const tblPr = `<w:tblPr><w:tblW w:w="9600" w:type="dxa"/>${borders}<w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const head = `<w:tr><w:tc><w:tcPr><w:tcW w:w="9600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F4F2EC"/></w:tcPr>${para(
    "Beyaz listeye alınacak statik IP adresleri",
    { bold: true, size: 9.5, after: 0 },
  )}</w:tc></w:tr>`;
  const rows = ips
    .map(
      (ip) =>
        `<w:tr><w:tc><w:tcPr><w:tcW w:w="9600" w:type="dxa"/></w:tcPr>${para(ip, { size: 10, after: 0 })}</w:tc></w:tr>`,
    )
    .join("");
  return `<w:tbl>${tblPr}${grid}${head}${rows}</w:tbl>`;
}

function buildDocumentXml(d: FilledFormData): string {
  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  const body =
    para(`${d.bankName} — Hesap Hareketleri / Ekstre Web Servis Yetkilendirme Başvurusu`, {
      bold: true,
      size: 14,
      color: "1C1A15",
      after: 40,
    }) +
    para(`Tarih: ${today}`, { size: 9.5, color: "6B6558", after: 160 }) +
    para(
      `Sayın ${d.bankName} Yetkilisi, ${d.unvan} (VKN ${dash(d.vergiNo)}) olarak, nezdinizdeki hesaplarımıza ait ` +
        `hesap özeti / hesap hareketi bilgilerinin web servis üzerinden ${d.providerName} (${d.providerBrand}) ile ` +
        `paylaşılmasını ve aşağıdaki statik IP adreslerinin bankanız nezdinde beyaz listeye (whitelist) alınmasını talep ederiz.`,
      { size: 10 },
    ) +
    sectionTitle("Firma Bilgileri") +
    kvTable([
      ["Firma unvanı", d.unvan],
      ["Vergi kimlik no (VKN)", d.vergiNo],
      ["MERSİS no", d.mersisNo],
      ["Bankadaki müşteri no", d.musteriNo],
      ["Adres", d.adres],
    ]) +
    sectionTitle("İdari Yetkili") +
    kvTable([
      ["Ad soyad", d.yetkili],
      ["Ünvan", d.yetkiliUnvan],
      ["Telefon", d.telefon],
      ["E-posta", d.eposta],
      ["KEP adresi", d.kep],
    ]) +
    sectionTitle("Teknik Yetkili") +
    kvTable([
      ["Ad soyad", d.teknikYetkili],
      ["GSM", d.teknikGsm],
      ["E-posta", d.teknikEposta],
    ]) +
    sectionTitle("Hizmet ve Kapsam") +
    kvTable([
      ["Ürün / hizmet", "Netekstre — hesap ekstresi ve hareket toplama"],
      ["Hesap kapsamı / IBAN", d.kapsam && d.kapsam.trim() ? d.kapsam : "Firmaya ait tüm hesaplar"],
      ["Bağlantı türü", `Web servis (${d.providerBrand} sistemine entegrasyon)`],
    ]) +
    sectionTitle("Bilgi Paylaşılacak Firma (Sağlayıcı)") +
    kvTable([
      ["Sağlayıcı unvanı", d.providerName],
      ["Marka", d.providerBrand],
    ]) +
    para("", { after: 40 }) +
    ipTable(d.ips) +
    sectionTitle("KVKK Muvafakati") +
    para(
      `6698 sayılı KVKK kapsamında, yukarıda belirtilen hesaplara ait hesap özeti / hareket bilgilerinin ` +
        `${d.providerName} (${d.providerBrand}) ile web servis aracılığıyla paylaşılmasına muvafakat ederiz.`,
      { size: 9.5, color: "3B382F", after: 200 },
    ) +
    // İmza bloğu
    (() => {
      const grid = `<w:tblGrid><w:gridCol w:w="4800"/><w:gridCol w:w="4800"/></w:tblGrid>`;
      const cell = (t: string) =>
        `<w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>${para(t, { size: 9.5, after: 0 })}${para(
          "",
          { after: 220 },
        )}${para("İmza / Kaşe: ______________________", { size: 9.5, after: 0 })}</w:tc>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/></w:tblPr>${grid}<w:tr>${cell(
        `Firma: ${d.unvan}`,
      )}${cell(`Yetkili: ${dash(d.yetkili)}`)}</w:tr></w:tbl>`;
    })() +
    para(
      "Not: Bu form, başvuru bilgilerinin tamamı önceden doldurulmuş resmi taleptir; imzalayıp bankaya iletmeniz yeterlidir. " +
        "Bankanın kendi matbu formunu talep etmesi hâlinde, aynı bilgilerle o form da eklenebilir.",
      { size: 8, color: "8A8474", after: 0 },
    );

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `</Types>`;

const RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

/** Dolu başvuru formunu .docx olarak üretir (Uint8Array). */
export function buildFilledDocx(data: FilledFormData): Uint8Array {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/document.xml", buildDocumentXml(data));
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

/** Banka adından dosya adı türetir (Türkçe karakterler sadeleştirilir). */
function slugify(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function triggerDownload(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Tek bankanın dolu .docx dosyasını indirir. */
export function downloadFilledDocx(data: FilledFormData) {
  triggerDownload(buildFilledDocx(data), `${slugify(data.bankName)}-netekstre-basvuru-dolu.docx`, DOCX_MIME);
}

/** Seçilen tüm bankaların dolu formlarını tek .zip olarak indirir. */
export function downloadAllFilledDocx(list: FilledFormData[]) {
  if (list.length === 0) return;
  if (list.length === 1) {
    downloadFilledDocx(list[0]);
    return;
  }
  const bundle = new PizZip();
  const used = new Set<string>();
  for (const data of list) {
    let name = `${slugify(data.bankName)}-netekstre-basvuru-dolu.docx`;
    let i = 2;
    while (used.has(name)) name = `${slugify(data.bankName)}-${i++}-netekstre-basvuru-dolu.docx`;
    used.add(name);
    bundle.file(name, buildFilledDocx(data));
  }
  const bytes = bundle.generate({ type: "uint8array", compression: "DEFLATE" });
  triggerDownload(bytes, `netekstre-basvuru-formlari-${list.length}-banka.zip`, "application/zip");
}

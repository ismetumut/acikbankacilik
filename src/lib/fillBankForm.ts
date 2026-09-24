/**
 * Bankaların KENDİ docx formunu tarayıcıda doldurur (sunucu gerekmez).
 * Tablo hücrelerini etiketlerine göre eşleyip komşu/alt boş hücreye değeri işler.
 * Yatay ([etiket][boş]) ve dikey (etiket satırı / altındaki boş satır) düzenleri destekler.
 *
 * Not: Yalnızca tablo-temelli docx'lerde çalışır. Prose/inline formlar (qnb, teb, ing…)
 * ve eski doc/xls/pdf formlar bu yolla doldurulamaz — onlar için genel dolu .docx kullanılır.
 */
import PizZip from "pizzip";

export interface BankFormData {
  unvan: string;
  vergiNo: string;
  mersisNo: string;
  adres: string;
  musteriNo: string;
  yetkili: string;
  telefon: string;
  eposta: string;
  kep: string;
  ip: string;
  iban: string;
}

type FieldKey = keyof BankFormData;

/** Etiket (normalize) → alan. İlk eşleşen kazanır; sıra önemlidir (özelden genele). */
const FIELD_KEYS: [FieldKey, string[]][] = [
  ["musteriNo", ["müşterino", "müşterinumarası"]],
  ["vergiNo", ["vergikimlikno", "vergikimliknumarası", "vkntckn", "vkn", "vergino", "verginumarası"]],
  ["mersisNo", ["mersisno", "mersisnumarası", "mersis"]],
  [
    "unvan",
    ["firmaunvanı", "ticaretunvanı", "firmaadı", "şirketunvanı", "müşteriadı", "müşteriünvanı", "müşteriismi", "firmaismi", "hesapsahibi", "tüzelkişi", "kuruluşadı", "mükellefadı", "ünvanı", "unvanı"],
  ],
  ["kep", ["kepadresi", "kep"]],
  ["eposta", ["yetkilieposta", "yetkiliemail", "epostaadresi", "emailadresi", "mailadresi", "elektronikposta", "eposta", "email", "mail"]],
  ["adres", ["firmaadresi", "tebligatadresi", "açıkadres", "adresi", "adres"]],
  ["telefon", ["yetkiligsmno", "yetkiligsm", "yetkilitelefon", "telefonnumarası", "telefonno", "gsmno", "ceptelefonu", "telefon", "gsm", "cep"]],
  ["yetkili", ["yetkiliadısoyadı", "yetkiliadsoyad", "yetkiliadı", "yetkiliismi", "adsoyad", "adısoyadı", "yetkilikişi", "ilgilikişi", "iletişimkişisi", "isimsoyisim"]],
  ["iban", ["ibannumarası", "ibanno", "iban", "hesapnumarası", "hesapno", "belirttiğimhesap"]],
];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[\s:*.\-()/]/g, "").trim();

function matchField(label: string): FieldKey | null {
  const n = norm(label);
  if (!n) return null;
  for (const [field, keys] of FIELD_KEYS) for (const k of keys) if (n === k || n.includes(k)) return field;
  return null;
}

/**
 * "Etiket: <sonrası>" kalıbından güvenli etiket çıkarır.
 * Onay-kutusu satırlarını (□ ☐ ▢) ve cümle-uzunluğundaki metinleri eler;
 * iki noktadan önceki son kısa parçayı etiket kabul eder.
 */
function labelBeforeColon(text: string): { field: FieldKey; after: string } | null {
  const ci = text.indexOf(":");
  if (ci <= 0) return null;
  const seg = text.slice(0, ci);
  if (/[□☐▢❒☑☒]/.test(seg)) return null; // onay kutusu → seçili değil, alan değil
  const parts = seg.trim().split(/[.►\t]|\s{2,}/).filter(Boolean);
  const label = parts.length ? parts[parts.length - 1].trim() : "";
  if (!label || label.length > 25) return null;
  const field = matchField(label);
  if (!field) return null;
  return { field, after: text.slice(ci + 1).trim() };
}

function cellText(tc: Element): string {
  const ts = tc.getElementsByTagName("w:t");
  let s = "";
  for (let i = 0; i < ts.length; i++) s += ts[i].textContent || "";
  return s.trim();
}

function directCells(tr: Element): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < tr.childNodes.length; i++) {
    const n = tr.childNodes[i] as Element;
    if (n.nodeType === 1 && n.tagName === "w:tc") out.push(n);
  }
  return out;
}

/** Bir hücrenin içeriğini tek bir değer paragrafıyla değiştirir; tcPr korunur. */
function setCellValue(tc: Element, value: string, doc: Document) {
  const tcPr = tc.getElementsByTagName("w:tcPr")[0];
  const tcPrClone = tcPr ? (tcPr.cloneNode(true) as Element) : null;
  while (tc.firstChild) tc.removeChild(tc.firstChild);
  if (tcPrClone) tc.appendChild(tcPrClone);
  const p = doc.createElement("w:p");
  const r = doc.createElement("w:r");
  const t = doc.createElement("w:t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = value;
  r.appendChild(t);
  p.appendChild(r);
  tc.appendChild(p);
}

export interface FillResult {
  bytes: Uint8Array;
  filled: FieldKey[];
}

function paraText(p: Element): string {
  const ts = p.getElementsByTagName("w:t");
  let s = "";
  for (let i = 0; i < ts.length; i++) s += ts[i].textContent || "";
  return s.trim();
}

/** Sadece boş/nokta/alt-çizgi/… içeren (doldurulmayı bekleyen) yer tutucu mu? */
function isPlaceholder(t: string): boolean {
  return t === "" || /^[\s.…_·…–-]+$/.test(t);
}

function hasTableAncestor(node: Element): boolean {
  let p = node.parentNode as Element | null;
  while (p) {
    if (p.nodeType === 1 && p.tagName === "w:tc") return true;
    p = p.parentNode as Element | null;
  }
  return false;
}

/** Paragrafın sonuna değer run'ı ekler; içindeki yer-tutucu (nokta) run'larını boşaltır. */
function appendValueRun(p: Element, value: string, doc: Document) {
  const ts = p.getElementsByTagName("w:t");
  for (let i = 0; i < ts.length; i++) {
    const txt = ts[i].textContent || "";
    if (txt && isPlaceholder(txt.trim())) ts[i].textContent = "";
  }
  const r = doc.createElement("w:r");
  const t = doc.createElement("w:t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = " " + value;
  r.appendChild(t);
  p.appendChild(r);
}

/** Paragraf içeriğini tek değer run'ıyla değiştirir (pPr korunur). */
function setParaText(p: Element, value: string, doc: Document) {
  const pPr = p.getElementsByTagName("w:pPr")[0];
  const pPrClone = pPr ? (pPr.cloneNode(true) as Element) : null;
  while (p.firstChild) p.removeChild(p.firstChild);
  if (pPrClone) p.appendChild(pPrClone);
  const r = doc.createElement("w:r");
  const t = doc.createElement("w:t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = value;
  r.appendChild(t);
  p.appendChild(r);
}

/**
 * docx baytlarını alır, tablo alanlarını doldurur, dolu docx döndürür.
 * DOMParser/XMLSerializer global olmalı (tarayıcıda yerleşik; node testinde @xmldom ile enjekte edilir).
 */
export function fillDocxBytes(input: ArrayBuffer | Uint8Array, data: BankFormData): FillResult {
  const zip = new PizZip(input);
  const xml = zip.file("word/document.xml")!.asText();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const rows = Array.from(doc.getElementsByTagName("w:tr"));
  const rowCells = rows.map(directCells);
  const used = new Set<FieldKey>();

  const isBlankCell = (tc: Element) => isPlaceholder(cellText(tc));
  const tryFill = (field: FieldKey, tc: Element) => {
    if (used.has(field)) return;
    const v = data[field];
    if (!v) return;
    if (!isBlankCell(tc)) return; // hedef boş/yer-tutucu değilse dokunma
    setCellValue(tc, v, doc);
    used.add(field);
  };

  // Yatay: [etiket][boş/yer-tutucu]
  for (const tcs of rowCells) {
    for (let c = 0; c < tcs.length - 1; c++) {
      const f = matchField(cellText(tcs[c]));
      if (f) tryFill(f, tcs[c + 1]);
    }
  }
  // Dikey: tek-hücre etiket satırı, hemen altında tek-hücre boş satır
  for (let r = 0; r < rowCells.length - 1; r++) {
    if (rowCells[r].length === 1 && rowCells[r + 1].length === 1) {
      const f = matchField(cellText(rowCells[r][0]));
      if (f) tryFill(f, rowCells[r + 1][0]);
    }
  }
  // Hücre-içi "Etiket: <yer tutucu>" (aynı hücrede değer)
  for (const tcs of rowCells) {
    for (const tc of tcs) {
      const m = labelBeforeColon(cellText(tc));
      if (!m || used.has(m.field) || !data[m.field] || !isPlaceholder(m.after)) continue;
      const cp = tc.getElementsByTagName("w:p")[0];
      if (cp) {
        appendValueRun(cp, data[m.field], doc);
        used.add(m.field);
      }
    }
  }

  // Prose formlar: gövde paragrafları (tablo dışı)
  const bodyParas = Array.from(doc.getElementsByTagName("w:p")).filter((p) => !hasTableAncestor(p));

  // A) Satır-içi "Etiket: <yer tutucu>"
  for (const p of bodyParas) {
    const m = labelBeforeColon(paraText(p));
    if (!m || used.has(m.field) || !data[m.field] || !isPlaceholder(m.after)) continue;
    appendValueRun(p, data[m.field], doc);
    used.add(m.field);
  }

  // B) Etiket paragrafı + hemen sonraki yer-tutucu paragraf
  for (let i = 0; i < bodyParas.length; i++) {
    const f = matchField(paraText(bodyParas[i]));
    if (!f || used.has(f) || !data[f]) continue;
    let j = i + 1;
    while (j < bodyParas.length && paraText(bodyParas[j]) === "") j++;
    if (j >= bodyParas.length) continue;
    const nextText = paraText(bodyParas[j]);
    if (nextText !== "" && isPlaceholder(nextText)) {
      setParaText(bodyParas[j], data[f], doc);
      used.add(f);
    }
  }

  const serialized = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", serialized);
  return { bytes: zip.generate({ type: "uint8array", compression: "DEFLATE" }), filled: [...used] };
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Bankanın docx formunu indirir, doldurur ve dolu halini indirtir.
 * Kaç alanın dolduğunu döndürür (0 → tablo eşleşmedi, prose form olabilir).
 */
export async function fillAndDownloadBankForm(
  formUrl: string,
  downloadName: string,
  data: BankFormData,
): Promise<number> {
  const res = await fetch(formUrl.startsWith("/") ? formUrl : `/${formUrl}`);
  if (!res.ok) throw new Error(`Form indirilemedi: ${res.status}`);
  const buf = await res.arrayBuffer();
  const { bytes, filled } = fillDocxBytes(buf, data);
  if (filled.length === 0) return 0; // tablo eşleşmedi → değiştirilmemiş dosyayı indirme
  const blob = new Blob([bytes as unknown as BlobPart], { type: DOCX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filled.length;
}

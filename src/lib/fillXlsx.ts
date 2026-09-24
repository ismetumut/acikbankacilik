/**
 * Bankaların .xlsx başvuru formunu tarayıcıda doldurur (exceljs, sunucusuz).
 * A/B sütunundaki etiketi bulur, değeri sağdaki (birleşik) değer hücresine yazar.
 */
import ExcelJS from "exceljs";
import type { BankFormData } from "@/lib/fillBankForm";

type FieldKey = keyof BankFormData;

const FIELD_KEYS: [FieldKey, string[]][] = [
  ["musteriNo", ["müşterino", "cif", "cifno", "müşterinumarası"]],
  ["vergiNo", ["vergikimlikno", "vkn", "vergino", "verginumarası"]],
  ["mersisNo", ["mersisno", "mersis"]],
  ["unvan", ["kurumadı", "firmaunvanı", "ünvanı", "unvanı", "firmaadı", "müşteriadı", "müşteriünvanı", "müşteriismi", "firmaismi", "kurumunvanı"]],
  ["kep", ["kepadresi", "kep"]],
  ["eposta", ["email", "eposta", "epostaadresi", "emailadresi", "mail", "elektronikposta"]],
  ["adres", ["firmaadresi", "adresi", "adres"]],
  ["telefon", ["telefon", "gsm", "cep", "telefonnumarası", "gsmno"]],
  ["yetkili", ["firmayetkilisi", "yetkiliadısoyadı", "yetkili", "adsoyad", "adısoyadı", "yetkilikişi", "ilgilikişi"]],
];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[\s:*.\-()/]/g, "").trim();

function matchField(label: string): FieldKey | null {
  const trimmed = label.trim();
  if (trimmed.length > 20) return null; // bölüm başlığı (ör. "ERİŞİM YETKİLİSİ BİLGİLERİ") → alan değil
  const n = norm(label);
  if (!n) return null;
  if (n.includes("ıpadres") || n.includes("ipadres")) return null; // IP alanı doldurulmaz
  for (const [field, keys] of FIELD_KEYS) for (const k of keys) if (n === k || n.includes(k)) return field;
  return null;
}

function cellStr(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return o.text;
    if (o.result != null) return String(o.result);
    return "";
  }
  return String(v);
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface XlsxFillResult {
  bytes: Uint8Array;
  filled: FieldKey[];
}

/** xlsx baytlarını doldurur; hangi alanların dolduğunu döndürür. */
export async function fillXlsxBytes(input: ArrayBuffer | Uint8Array, data: BankFormData): Promise<XlsxFillResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(input as ArrayBuffer);
  const used = new Set<FieldKey>();

  for (const ws of wb.worksheets) {
    // Birleşik aralıkların bitiş sütununu bul (etiketten sonra değer hücresini seçmek için)
    const merges: { top: number; left: number; bottom: number; right: number }[] = [];
    const model = ws.model as unknown as { merges?: string[] };
    for (const m of model.merges ?? []) {
      const mm = /([A-Z]+)(\d+):([A-Z]+)(\d+)/.exec(m);
      if (!mm) continue;
      merges.push({
        left: colNum(mm[1]),
        top: +mm[2],
        right: colNum(mm[3]),
        bottom: +mm[4],
      });
    }
    const mergeRightOf = (row: number, col: number): number | null => {
      for (const mg of merges) if (row >= mg.top && row <= mg.bottom && col >= mg.left && col <= mg.right) return mg.right;
      return null;
    };
    const isMergedSlave = (row: number, col: number): boolean => {
      for (const mg of merges) if (row >= mg.top && row <= mg.bottom && col >= mg.left && col <= mg.right) return !(row === mg.top && col === mg.left);
      return false;
    };

    const maxRow = Math.min(ws.rowCount, 60);
    for (let r = 1; r <= maxRow; r++) {
      const labelText = cellStr(ws.getCell(r, 1).value) || cellStr(ws.getCell(r, 2).value);
      const f = matchField(labelText);
      if (!f || used.has(f) || !data[f]) continue;
      // Değer sütunu: etiketin birleşik aralığının hemen sağı; yoksa 3. sütun (C)
      const labelRight = mergeRightOf(r, 1) ?? 2;
      let targetCol = labelRight + 1;
      // hedef birleşik slave ise ustasına kay
      while (targetCol < 14 && isMergedSlave(r, targetCol)) targetCol++;
      const target = ws.getCell(r, targetCol);
      if (cellStr(target.value).trim()) continue; // dolu ise dokunma
      target.value = data[f];
      used.add(f);
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return { bytes: new Uint8Array(out), filled: [...used] };
}

function colNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Banka xlsx formunu indirir, doldurur ve indirtir. 0 → eşleşmedi. */
export async function fillAndDownloadXlsx(formUrl: string, downloadName: string, data: BankFormData): Promise<number> {
  const res = await fetch(formUrl.startsWith("/") ? formUrl : `/${formUrl}`);
  if (!res.ok) throw new Error(`Form indirilemedi: ${res.status}`);
  const { bytes, filled } = await fillXlsxBytes(await res.arrayBuffer(), data);
  if (filled.length === 0) return 0;
  const blob = new Blob([bytes as unknown as BlobPart], { type: XLSX_MIME });
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

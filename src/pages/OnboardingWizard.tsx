import { useState } from "react";
import { Link } from "react-router-dom";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingRows } from "@/components/ui/Skeleton";
import {
  BANK_APPLICATION_INFO,
  COMPANY_DETAILS,
  FINROTA_ACCESS_IPS,
  ONBOARDING_PRODUCTS,
  PROVIDER_NAME,
} from "@/lib/mockData";
import type { BankApplicationInfo, OnboardingProduct } from "@/lib/types";

const FINROTA_CC = "kurulum@finrota.com";

const STEPS = [
  { n: 1, label: "Banka" },
  { n: 2, label: "Ürünler" },
  { n: 3, label: "Firma bilgileri" },
  { n: 4, label: "Çıktı & gönderim" },
];

const DIRECTION_META: Record<OnboardingProduct["direction"], { label: string; tone: "positive" | "warning" | "neutral" }> = {
  veri: { label: "Veri çekme", tone: "neutral" },
  tahsilat: { label: "Tahsilat", tone: "positive" },
  odeme: { label: "Ödeme", tone: "warning" },
};

interface FormState {
  unvan: string;
  vergiDairesi: string;
  vergiNo: string;
  mersisNo: string;
  adres: string;
  yetkili: string;
  yetkiliUnvan: string;
  yetkiliTckn: string;
  telefon: string;
  eposta: string;
  kep: string;
  kapsam: string;
}

export function OnboardingWizard() {
  const banking = useBanking();
  const { data: applications, refetch } = useAsync(() => banking.getOnboardingApplications(), []);

  const [step, setStep] = useState(1);
  const [bankId, setBankId] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>({ ...COMPANY_DETAILS, kapsam: "" });
  const [sentMark, setSentMark] = useState(false);

  const bank = BANK_APPLICATION_INFO.find((b) => b.bankId === bankId) ?? null;
  const selectedProducts = ONBOARDING_PRODUCTS.filter((p) => productIds.has(p.id));

  function toggleProduct(id: string) {
    setProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formCode(b: BankApplicationInfo, p: OnboardingProduct) {
    return `${b.formCodePrefix}-${p.code}`;
  }

  function printForms() {
    if (!bank) return;
    const row = (k: string, v: string) => `<tr><th>${k}</th><td>${v || "—"}</td></tr>`;
    const ipRows = FINROTA_ACCESS_IPS.map((ip) => `<tr><td class="mono">${ip}</td></tr>`).join("");
    const pages = selectedProducts
      .map(
        (p, i) => `
      <section class="${i > 0 ? "pb" : ""}">
        <h1>${bank.bankName} — ${PROVIDER_NAME} ${p.name} Başvuru ve IP Yetkilendirme Formu</h1>
        <div class="sub">Form kodu: ${formCode(bank, p)} · Düzenlenme: ${new Date().toLocaleDateString("tr-TR")}</div>
        <h2>Firma bilgileri</h2>
        <table>
          ${row("Firma unvanı", form.unvan)}
          ${row("Vergi dairesi / No", `${form.vergiDairesi} · ${form.vergiNo}`)}
          ${row("MERSIS no", form.mersisNo)}
          ${row("Adres", form.adres)}
        </table>
        <h2>Yetkili kişi</h2>
        <table>
          ${row("Ad soyad / Ünvan", `${form.yetkili} · ${form.yetkiliUnvan}`)}
          ${row("T.C. Kimlik No", form.yetkiliTckn)}
          ${row("Telefon / E-posta", `${form.telefon} · ${form.eposta}`)}
          ${row("KEP adresi", form.kep)}
        </table>
        <h2>Talep edilen hizmet</h2>
        <table>
          ${row("Ürün", p.name)}
          ${row("Kapsam", p.scope)}
          ${row("Paylaşılacak veri / işlem", p.dataDetail)}
          ${row("Hesap kapsamı", form.kapsam || "Firmaya ait tüm hesaplar")}
        </table>
        <h2>${PROVIDER_NAME} erişim IP adresleri — beyaz listeye (whitelist) alınacaktır</h2>
        <p class="note2">Aşağıdaki IP adreslerinden gelen web servis taleplerine izin verilmesini talep ederiz. Erişim yalnızca yukarıdaki kapsamla sınırlıdır.</p>
        <table><tr><th>IP adresi / blok</th></tr>${ipRows}</table>
        <p class="consent">${form.unvan} olarak, ${bank.bankName} nezdindeki hesaplarımıza ilişkin yukarıda belirtilen veri ve işlemlerin, ${PROVIDER_NAME} tarafından yukarıdaki IP adresleri üzerinden erişilmesine muvafakat ederiz.</p>
        <div class="sign"><div>Yetkili imza & kaşe</div><div>Tarih</div></div>
      </section>`,
      )
      .join("");
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${bank.bankName} başvuru formları</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, Arial, sans-serif; color: #1c1a15; margin: 40px; }
  section.pb { page-break-before: always; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #ccc; padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #f4f2ec; width: 34%; font-weight: 600; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 16px 0 6px; }
  .note2 { font-size: 11px; color: #666; margin: 0 0 8px; }
  .consent { font-size: 12px; background: #f8f6f0; border: 1px solid #e4e0d4; padding: 10px; border-radius: 6px; margin: 12px 0; }
  .sign { margin-top: 36px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; border-top: 1px solid #333; padding-top: 6px; font-size: 12px; }
</style></head><body>${pages}</body></html>`;
    const w = window.open("", "_blank", "width=840,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  function emailText() {
    if (!bank) return { subject: "", body: "" };
    const productList = selectedProducts.map((p) => `- ${p.name} (${formCode(bank, p)})`).join("\n");
    const ipList = FINROTA_ACCESS_IPS.map((ip) => `- ${ip}`).join("\n");
    const subject = `${form.unvan} — ${bank.bankName} ${PROVIDER_NAME} Başvuru / IP Yetkilendirme`;
    const body = `Sayın ${bank.bankName} Kurumsal Müşteri Hizmetleri,

${form.unvan} (VKN ${form.vergiNo}) olarak, aşağıdaki ${PROVIDER_NAME} ürünleri için hesap/veri paylaşımı ve işlem yetkilendirmesi talep ediyoruz:

${productList}

Bu hizmetlerin çalışabilmesi için ${PROVIDER_NAME} sunucularına ait aşağıdaki IP adreslerinin bankanız nezdinde beyaz listeye (whitelist) alınmasını ve ilgili web servis erişiminin tanımlanmasını rica ederiz:

${ipList}

Islak imzalı başvuru formları ektedir. ${PROVIDER_NAME} kurulum ekibini (${FINROTA_CC}) bilgi (CC) olarak ekledik.

Saygılarımızla,
${form.yetkili} · ${form.yetkiliUnvan}
${form.unvan}
${form.telefon} · ${form.eposta}`;
    return { subject, body };
  }

  function mailtoHref() {
    if (!bank) return "#";
    const { subject, body } = emailText();
    return `mailto:${bank.applyTo}?cc=${encodeURIComponent(FINROTA_CC)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function markAsSent() {
    if (!bank) return;
    for (const p of selectedProducts) {
      await banking.saveOnboardingApplication({ bankId: bank.bankId, productId: p.id, company: form.unvan, status: "sent" });
    }
    setSentMark(true);
    refetch();
  }

  const appStatus = (bId: string, pId: string) => applications?.find((a) => a.bankId === bId && a.productId === pId)?.status;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step > s.n ? "bg-brand-500 text-white" : step === s.n ? "bg-ink-900 text-white" : "bg-cream-200 text-muted"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </span>
            <span className={`hidden text-sm font-semibold sm:inline ${step >= s.n ? "text-ink-900" : "text-muted"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line sm:w-8" />}
          </div>
        ))}
      </div>

      {/* 1 · Banka */}
      {step === 1 && (
        <Card>
          <h2 className="font-display mb-1 text-center text-xl font-extrabold text-ink-900">Bankanı seç</h2>
          <p className="mb-6 text-center text-sm text-muted">
            Her banka için ayrı başvuru gerekir. Başvuru, {PROVIDER_NAME} sunucularının veri çekebilmesi için IP
            yetkilendirmesi alır.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BANK_APPLICATION_INFO.map((b) => (
              <button
                key={b.bankId}
                onClick={() => setBankId(b.bankId)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                  bankId === b.bankId ? "border-brand-600 bg-brand-50" : "border-line hover:bg-cream-100"
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
                  style={{ backgroundColor: b.colorHex }}
                >
                  {b.initials}
                </span>
                <span className="truncate text-sm font-semibold text-ink-900">{b.bankName}</span>
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-6 w-full" disabled={!bankId} onClick={() => setStep(2)}>
            Devam et →
          </Button>
        </Card>
      )}

      {/* 2 · Ürünler */}
      {step === 2 && bank && (
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold text-white" style={{ backgroundColor: bank.colorHex }}>
              {bank.initials}
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900">{bank.bankName} için ürünler</h2>
              <p className="text-xs text-muted">Başvuracağın ürünleri seç — her ürün için ayrı form üretilir</p>
            </div>
          </div>
          <div className="space-y-2">
            {ONBOARDING_PRODUCTS.map((p) => {
              const checked = productIds.has(p.id);
              const st = appStatus(bank.bankId, p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    checked ? "border-brand-600 bg-brand-50" : "border-line hover:bg-cream-100"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-ink-900">{p.name}</p>
                      <Badge tone={DIRECTION_META[p.direction].tone}>{DIRECTION_META[p.direction].label}</Badge>
                      {st && <Badge tone={st === "sent" ? "warning" : st === "approved" ? "positive" : "neutral"}>{st === "sent" ? "Gönderildi" : st === "approved" ? "Onaylı" : "Taslak"}</Badge>}
                    </div>
                    <p className="text-xs text-muted">{p.scope}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted">Form: {formCode(bank, p)} · Veri: {p.dataDetail}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>← Geri</Button>
            <Button variant="primary" className="flex-1" disabled={productIds.size === 0} onClick={() => setStep(3)}>
              Devam ({productIds.size} ürün) →
            </Button>
          </div>
        </Card>
      )}

      {/* 3 · Firma bilgileri */}
      {step === 3 && bank && (
        <Card>
          <h2 className="font-display mb-1 text-lg font-extrabold text-ink-900">Firma & yetkili bilgileri</h2>
          <p className="mb-4 text-xs text-muted">Bilgiler tüm formlarda kullanılır — kontrol edip düzenleyin</p>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Firma</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Firma unvanı" value={form.unvan} onChange={(v) => setForm((f) => ({ ...f, unvan: v }))} />
            <Field label="MERSIS no" value={form.mersisNo} onChange={(v) => setForm((f) => ({ ...f, mersisNo: v }))} />
            <Field label="Vergi dairesi" value={form.vergiDairesi} onChange={(v) => setForm((f) => ({ ...f, vergiDairesi: v }))} />
            <Field label="Vergi no" value={form.vergiNo} onChange={(v) => setForm((f) => ({ ...f, vergiNo: v }))} />
            <div className="sm:col-span-2">
              <Field label="Adres" value={form.adres} onChange={(v) => setForm((f) => ({ ...f, adres: v }))} />
            </div>
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">Yetkili kişi</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ad soyad" value={form.yetkili} onChange={(v) => setForm((f) => ({ ...f, yetkili: v }))} />
            <Field label="Ünvan" value={form.yetkiliUnvan} onChange={(v) => setForm((f) => ({ ...f, yetkiliUnvan: v }))} />
            <Field label="Telefon" value={form.telefon} onChange={(v) => setForm((f) => ({ ...f, telefon: v }))} />
            <Field label="E-posta" value={form.eposta} onChange={(v) => setForm((f) => ({ ...f, eposta: v }))} />
            <Field label="KEP adresi" value={form.kep} onChange={(v) => setForm((f) => ({ ...f, kep: v }))} />
            <Field label="Hesap kapsamı / IBAN (ops.)" value={form.kapsam} onChange={(v) => setForm((f) => ({ ...f, kapsam: v }))} />
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>← Geri</Button>
            <Button variant="primary" className="flex-1" onClick={() => setStep(4)}>Formları hazırla →</Button>
          </div>
        </Card>
      )}

      {/* 4 · Çıktı & gönderim */}
      {step === 4 && bank && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-ink-900">Formlar hazır</h2>
                <p className="text-xs text-muted">{bank.bankName} · {selectedProducts.length} ürün · her ürün ayrı form</p>
              </div>
              <Button variant="secondary" size="sm" onClick={printForms}>🖨 Tüm formları yazdır / PDF</Button>
            </div>
            <div className="space-y-2">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">{p.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted">{formCode(bank, p)}</p>
                  </div>
                  <Badge tone={DIRECTION_META[p.direction].tone}>{DIRECTION_META[p.direction].label}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-1">IP yetkilendirme e-postası</CardTitle>
            <p className="mb-3 text-xs text-muted">
              Formları imzalayıp aşağıdaki e-postaya ekleyin. Alıcı: bankanız · CC: {PROVIDER_NAME} ({FINROTA_CC})
            </p>
            <div className="mb-3 rounded-xl border border-line bg-cream-100 p-3 text-xs">
              <div className="mb-1"><span className="font-bold">Kime:</span> <span className="font-mono">{bank.applyTo}</span></div>
              <div className="mb-1"><span className="font-bold">CC:</span> <span className="font-mono">{FINROTA_CC}</span></div>
              <div className="mb-2"><span className="font-bold">Konu:</span> {emailText().subject}</div>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-ink-900/90">{emailText().body}</pre>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 text-xs text-ink-900/80">
              <span className="font-bold">Whitelist edilecek {PROVIDER_NAME} IP'leri:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {FINROTA_ACCESS_IPS.map((ip) => (
                  <span key={ip} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink-900">{ip}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={mailtoHref()} className="flex-1">
                <Button variant="primary" className="w-full">✉ E-postayı aç</Button>
              </a>
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(emailText().body)}>Metni kopyala</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-display mb-1 text-base font-extrabold text-ink-900">Gönderim ve durum</h3>
            <p className="mb-3 text-xs text-muted">
              Kanal: <span className="font-semibold text-ink-900">{bank.channel}</span> · KEP:{" "}
              <span className="font-mono">{bank.applyTo}</span> · işlem süresi ~{bank.processDays}
            </p>
            <ul className="mb-4 space-y-2">
              {bank.cautions.map((c, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg bg-cream-100 px-3 py-2.5 text-sm text-ink-900">
                  <span className="shrink-0 text-warning-700">!</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            {sentMark ? (
              <div className="rounded-xl bg-brand-50 p-3 text-sm text-ink-900">
                ✓ {selectedProducts.length} başvuru "gönderildi" olarak işaretlendi. Banka onayı geldiğinde ürünler
                otomatik veri çekmeye başlar.
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={markAsSent}>Bankaya gönderdim olarak işaretle</Button>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>← Ürünleri düzenle</Button>
              <Link to="/" className="flex-1"><Button variant="primary" className="w-full">Bitir</Button></Link>
            </div>
          </Card>
        </div>
      )}

      {/* Başvuru durumu (her adımda görünür) */}
      <Card>
        <CardHeader>
          <CardTitle>Başvuru durumu</CardTitle>
          <span className="text-xs text-muted">banka × ürün</span>
        </CardHeader>
        {!applications ? (
          <LoadingRows rows={2} />
        ) : applications.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Henüz başvuru yok. Yukarıdan banka ve ürün seçip başlayın.</p>
        ) : (
          <div className="divide-y divide-line">
            {applications.map((a) => {
              const b = BANK_APPLICATION_INFO.find((x) => x.bankId === a.bankId);
              const p = ONBOARDING_PRODUCTS.find((x) => x.id === a.productId);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{b?.bankName} · {p?.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted">{b && p ? `${b.formCodePrefix}-${p.code}` : ""}</p>
                  </div>
                  <Badge tone={a.status === "approved" ? "positive" : a.status === "sent" ? "warning" : "neutral"}>
                    {a.status === "approved" ? "Onaylandı" : a.status === "sent" ? "Onay bekliyor" : "Taslak"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </label>
  );
}

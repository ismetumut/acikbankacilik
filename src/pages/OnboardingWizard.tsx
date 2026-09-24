import { useState } from "react";
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
  NETEKSTRE_BANKS,
  ONBOARDING_PRODUCTS,
  PROVIDER_BRAND,
  PROVIDER_NAME,
} from "@/lib/mockData";
const FINROTA_CC = "kurulum@finrota.com";

const STEPS = [
  { n: 1, label: "Ürün" },
  { n: 2, label: "Banka" },
  { n: 3, label: "Firma bilgileri" },
  { n: 4, label: "Çıktı & gönderim" },
];

interface FormState {
  unvan: string;
  vergiNo: string;
  mersisNo: string;
  adres: string;
  musteriNo: string;
  yetkili: string;
  yetkiliUnvan: string;
  telefon: string;
  eposta: string;
  kep: string;
  teknikYetkili: string;
  teknikGsm: string;
  teknikEposta: string;
  kapsam: string;
}

export function OnboardingWizard() {
  const banking = useBanking();
  const { data: applications, refetch } = useAsync(() => banking.getOnboardingApplications(), []);

  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [bankIds, setBankIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>({
    unvan: COMPANY_DETAILS.unvan,
    vergiNo: COMPANY_DETAILS.vergiNo,
    mersisNo: COMPANY_DETAILS.mersisNo,
    adres: COMPANY_DETAILS.adres,
    musteriNo: "",
    yetkili: COMPANY_DETAILS.yetkili,
    yetkiliUnvan: COMPANY_DETAILS.yetkiliUnvan,
    telefon: COMPANY_DETAILS.telefon,
    eposta: COMPANY_DETAILS.eposta,
    kep: COMPANY_DETAILS.kep,
    teknikYetkili: "",
    teknikGsm: "",
    teknikEposta: "",
    kapsam: "",
  });
  const [sentMark, setSentMark] = useState(false);

  const product = ONBOARDING_PRODUCTS.find((p) => p.id === productId) ?? null;
  const isNetekstre = productId === "netekstre";

  // Ürüne göre banka listesi: Netekstre → 27 gerçek form; diğerleri → genel katalog.
  const banks: { id: string; name: string }[] = isNetekstre
    ? NETEKSTRE_BANKS
    : BANK_APPLICATION_INFO.map((b) => ({ id: b.bankId, name: b.bankName }));
  const selectedBanks = banks.filter((b) => bankIds.has(b.id));
  const netekstreOf = (id: string) => NETEKSTRE_BANKS.find((b) => b.id === id);

  function toggleBank(id: string) {
    setBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function chooseProduct(id: string) {
    setProductId(id);
    setBankIds(new Set());
  }

  const ipList = FINROTA_ACCESS_IPS.join(" · ");

  function printGuide(bankName: string) {
    const row = (k: string, v: string) => `<tr><th>${k}</th><td>${v || "—"}</td></tr>`;
    const ipRows = FINROTA_ACCESS_IPS.map((ip) => `<tr><td class="mono">${ip}</td></tr>`).join("");
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${bankName} Netekstre doldurma rehberi</title>
<style>
  *{box-sizing:border-box} body{font:13px/1.5 -apple-system,Arial,sans-serif;color:#1c1a15;margin:40px}
  h1{font-size:17px;margin:0 0 2px} .sub{color:#666;font-size:12px;margin-bottom:16px}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555;margin:16px 0 6px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px} th,td{border:1px solid #ccc;padding:7px 9px;text-align:left;vertical-align:top}
  th{background:#f4f2ec;width:36%;font-weight:600} .mono{font-family:ui-monospace,Consolas,monospace}
  .box{background:#f8f6f0;border:1px solid #e4e0d4;padding:10px;border-radius:6px;font-size:12px;margin:10px 0}
  .note{font-size:11px;color:#777;margin-top:16px}
</style></head><body>
  <h1>${bankName} — Netekstre başvurusu · doldurma rehberi</h1>
  <div class="sub">Bu sayfa, indirdiğiniz resmi ${bankName} formunu doldurmanız içindir. Aşağıdaki bilgileri forma işleyin, imzalayıp bankaya iletin.</div>
  <h2>Firma bilgileri</h2>
  <table>
    ${row("Firma unvanı", form.unvan)}
    ${row("VKN", form.vergiNo)}
    ${row("MERSİS", form.mersisNo)}
    ${row("Müşteri no (bankadaki)", form.musteriNo)}
    ${row("Adres", form.adres)}
  </table>
  <h2>İdari yetkili</h2>
  <table>${row("Ad soyad / Ünvan", `${form.yetkili} · ${form.yetkiliUnvan}`)}${row("Telefon / E-posta", `${form.telefon} · ${form.eposta}`)}${row("KEP", form.kep)}</table>
  <h2>Teknik yetkili</h2>
  <table>${row("Ad soyad", form.teknikYetkili)}${row("GSM", form.teknikGsm)}${row("E-posta", form.teknikEposta)}</table>
  <h2>Hesap kapsamı</h2>
  <table>${row("Hesaplar / IBAN", form.kapsam || "Tüm hesaplar")}</table>
  <div class="box">
    <strong>Bilgi paylaşılacak firma (Diğer firma):</strong> ${PROVIDER_NAME} (${PROVIDER_BRAND})<br>
    <strong>${PROVIDER_NAME} statik IP adresleri (bankaya beyaz liste için):</strong>
  </div>
  <table><tr><th>Statik IP</th></tr>${ipRows}</table>
  <div class="box">Bağlantı türü: <em>Müşteri hesap bilgilerinin ${PROVIDER_BRAND} sistemine entegrasyonu</em>. KVKK: hesap bilgilerinin ${PROVIDER_NAME} ile paylaşılmasına muvafakat verilir (form üzerindeki ilgili kutu işaretlenir).</div>
  <p class="note">Not: Formun resmi/ıslak imzalı alanları bankaya özeldir; bu rehber yalnızca hangi bilgiyi nereye yazacağınızı gösterir.</p>
</body></html>`;
    const w = window.open("", "_blank", "width=840,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  function emailText() {
    const bankNames = selectedBanks.map((b) => b.name).join(", ");
    const productName = product?.name ?? "";
    const ipLines = FINROTA_ACCESS_IPS.map((ip) => `- ${ip}`).join("\n");
    const subject = `${form.unvan} — ${productName} / ${PROVIDER_BRAND} Hesap Hareketleri Web Servis Yetkilendirme`;
    const body = `Sayın Yetkili,

${form.unvan} (VKN ${form.vergiNo}) olarak, ${productName} hizmeti kapsamında nezdinizdeki hesaplarımıza ait hesap özeti / hareket bilgilerinin web servis üzerinden ${PROVIDER_NAME} (${PROVIDER_BRAND}) ile paylaşılmasını talep ediyoruz.

Ekte, tarafımızca doldurulup imzalanan ${bankNames} başvuru formu yer almaktadır.

Web servis erişiminin çalışabilmesi için ${PROVIDER_NAME} sunucularına ait aşağıdaki statik IP adreslerinin bankanız nezdinde beyaz listeye (whitelist) alınmasını rica ederiz:

${ipLines}

Bilgilerinize sunar, ${PROVIDER_BRAND} kurulum ekibini (${FINROTA_CC}) bilgi (CC) olarak eklediğimizi belirtiriz.

Saygılarımızla,
${form.yetkili} · ${form.yetkiliUnvan}
${form.unvan}
${form.telefon} · ${form.eposta}`;
    return { subject, body };
  }

  function mailtoHref(applyTo: string) {
    const { subject, body } = emailText();
    return `mailto:${applyTo}?cc=${encodeURIComponent(FINROTA_CC)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function resetWizard() {
    setSentMark(false);
    setBankIds(new Set());
    setProductId(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markAsSent() {
    if (!product) return;
    for (const b of selectedBanks) {
      await banking.saveOnboardingApplication({ bankId: b.id, productId: product.id, company: form.unvan, status: "sent" });
    }
    setSentMark(true);
    refetch();
  }

  const appStatus = (bId: string, pId: string) => applications?.find((a) => a.bankId === bId && a.productId === pId)?.status;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex shrink-0 items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step > s.n ? "bg-brand-500 text-white" : step === s.n ? "bg-ink-900 text-white" : "bg-cream-200 text-muted"}`}>
              {step > s.n ? "✓" : s.n}
            </span>
            <span className={`hidden text-sm font-semibold sm:inline ${step >= s.n ? "text-ink-900" : "text-muted"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line sm:w-8" />}
          </div>
        ))}
      </div>

      {/* 1 · Ürün */}
      {step === 1 && (
        <Card>
          <h2 className="font-display mb-1 text-center text-xl font-extrabold text-ink-900">Ürün seç</h2>
          <p className="mb-6 text-center text-sm text-muted">Her ürün için bankalarla ayrı başvuru yürütülür.</p>
          <div className="space-y-2">
            {ONBOARDING_PRODUCTS.map((p) => (
              <button
                key={p.id}
                onClick={() => chooseProduct(p.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${productId === p.id ? "border-brand-600 bg-brand-50" : "border-line hover:bg-cream-100"}`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${productId === p.id ? "border-brand-600 bg-brand-600" : "border-line"}`}>
                  {productId === p.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink-900">{p.name}</p>
                    {p.id === "netekstre" ? <Badge tone="positive">Gerçek banka formları</Badge> : <Badge tone="neutral">Genel form</Badge>}
                  </div>
                  <p className="text-xs text-muted">{p.scope}</p>
                </div>
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-6 w-full" disabled={!productId} onClick={() => setStep(2)}>Devam et →</Button>
        </Card>
      )}

      {/* 2 · Banka */}
      {step === 2 && product && (
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-extrabold text-ink-900">{product.name} — banka seç</h2>
            <Badge tone="brand">{bankIds.size} seçili</Badge>
          </div>
          <p className="mb-4 text-xs text-muted">
            {isNetekstre
              ? `Her banka için o bankanın gerçek başvuru formu üretilir. Toplam ${NETEKSTRE_BANKS.length} banka.`
              : "Başvuru yapılacak bankaları seç."}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {banks.map((b) => {
              const ne = netekstreOf(b.id);
              const checked = bankIds.has(b.id);
              const st = appStatus(b.id, product.id);
              return (
                <label key={b.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors ${checked ? "border-brand-600 bg-brand-50" : "border-line hover:bg-cream-100"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleBank(b.id)} className="h-4 w-4 accent-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{b.name}</p>
                    <div className="flex items-center gap-1.5">
                      {ne && <span className="font-mono text-[10px] text-muted">{ne.format} form</span>}
                      {st && <Badge tone={st === "sent" ? "warning" : "positive"}>{st === "sent" ? "Gönderildi" : "Onaylı"}</Badge>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>← Geri</Button>
            <Button variant="primary" className="flex-1" disabled={bankIds.size === 0} onClick={() => setStep(3)}>Devam ({bankIds.size} banka) →</Button>
          </div>
        </Card>
      )}

      {/* 3 · Firma bilgileri */}
      {step === 3 && product && (
        <Card>
          <h2 className="font-display mb-1 text-lg font-extrabold text-ink-900">Firma & yetkili bilgileri</h2>
          <p className="mb-4 text-xs text-muted">Formlara ve doldurma rehberine bu bilgiler işlenir</p>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Firma</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Firma unvanı" value={form.unvan} onChange={(v) => setForm((f) => ({ ...f, unvan: v }))} />
            <Field label="VKN" value={form.vergiNo} onChange={(v) => setForm((f) => ({ ...f, vergiNo: v }))} />
            <Field label="MERSİS" value={form.mersisNo} onChange={(v) => setForm((f) => ({ ...f, mersisNo: v }))} />
            <Field label="Müşteri no (bankadaki, ops.)" value={form.musteriNo} onChange={(v) => setForm((f) => ({ ...f, musteriNo: v }))} />
            <div className="sm:col-span-2"><Field label="Adres" value={form.adres} onChange={(v) => setForm((f) => ({ ...f, adres: v }))} /></div>
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">İdari yetkili</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ad soyad" value={form.yetkili} onChange={(v) => setForm((f) => ({ ...f, yetkili: v }))} />
            <Field label="Ünvan" value={form.yetkiliUnvan} onChange={(v) => setForm((f) => ({ ...f, yetkiliUnvan: v }))} />
            <Field label="Telefon" value={form.telefon} onChange={(v) => setForm((f) => ({ ...f, telefon: v }))} />
            <Field label="E-posta" value={form.eposta} onChange={(v) => setForm((f) => ({ ...f, eposta: v }))} />
            <Field label="KEP" value={form.kep} onChange={(v) => setForm((f) => ({ ...f, kep: v }))} />
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">Teknik yetkili (banka formları ister)</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Ad soyad" value={form.teknikYetkili} onChange={(v) => setForm((f) => ({ ...f, teknikYetkili: v }))} />
            <Field label="GSM" value={form.teknikGsm} onChange={(v) => setForm((f) => ({ ...f, teknikGsm: v }))} />
            <Field label="E-posta" value={form.teknikEposta} onChange={(v) => setForm((f) => ({ ...f, teknikEposta: v }))} />
          </div>
          <div className="mt-3"><Field label="Hesap kapsamı / IBAN (boş = tüm hesaplar)" value={form.kapsam} onChange={(v) => setForm((f) => ({ ...f, kapsam: v }))} /></div>

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>← Geri</Button>
            <Button variant="primary" className="flex-1" onClick={() => setStep(4)}>Formları hazırla →</Button>
          </div>
        </Card>
      )}

      {/* 4 · Çıktı */}
      {step === 4 && product && (
        <div className="space-y-6">
          <Card>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold text-ink-900">{product.name} — başvuru paketi</h2>
              <Badge tone="neutral">{selectedBanks.length} banka</Badge>
            </div>
            <p className="mb-4 text-xs text-muted">
              Sağlayıcı: <span className="font-semibold text-ink-900">{PROVIDER_NAME}</span> ({PROVIDER_BRAND}) · Beyaz
              listeye alınacak IP'ler: <span className="font-mono">{ipList}</span>
            </p>

            <div className="space-y-3">
              {selectedBanks.map((b) => {
                const ne = netekstreOf(b.id);
                const applyTo = BANK_APPLICATION_INFO.find((x) => x.bankId === b.id)?.applyTo ?? "";
                return (
                  <div key={b.id} className="rounded-xl border border-line p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">{b.name}</p>
                      {ne && <Badge tone="neutral">{ne.format}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ne ? (
                        <>
                          <a href={`/${ne.formFile}`} download>
                            <Button variant="primary" size="sm">⬇ Gerçek {b.name} formu</Button>
                          </a>
                          <Button variant="secondary" size="sm" onClick={() => printGuide(b.name)}>🖨 Doldurma rehberi</Button>
                        </>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => printGuide(b.name)}>🖨 Form / rehber</Button>
                      )}
                      {applyTo && (
                        <a href={mailtoHref(applyTo)}>
                          <Button variant="secondary" size="sm">✉ E-posta</Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-1">Bankaya gönderilecek e-posta</CardTitle>
            <p className="mb-3 text-xs text-muted">Formu imzalayıp ekleyin · CC: {PROVIDER_BRAND} ({FINROTA_CC})</p>
            <div className="mb-3 rounded-xl border border-line bg-cream-100 p-3 text-xs">
              <div className="mb-1"><span className="font-bold">Konu:</span> {emailText().subject}</div>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-ink-900/90">{emailText().body}</pre>
            </div>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(emailText().body)}>E-posta metnini kopyala</Button>
          </Card>

          <Card>
            {sentMark ? (
              <div className="rounded-xl bg-brand-50 p-3 text-sm text-ink-900">
                ✓ {selectedBanks.length} başvuru "gönderildi" olarak işaretlendi. Banka onayı gelince {product.name} veri
                çekmeye başlar.
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={markAsSent}>Bankalara gönderdim olarak işaretle</Button>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>← Bankaları düzenle</Button>
              <Button variant="primary" className="flex-1" onClick={resetWizard}>Yeni başvuru</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Başvuru durumu */}
      <Card>
        <CardHeader>
          <CardTitle>Başvuru durumu</CardTitle>
          <span className="text-xs text-muted">banka × ürün</span>
        </CardHeader>
        {!applications ? (
          <LoadingRows rows={2} />
        ) : applications.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Henüz başvuru yok. Yukarıdan ürün ve banka seçip başlayın.</p>
        ) : (
          <div className="divide-y divide-line">
            {applications.map((a) => {
              const bn = NETEKSTRE_BANKS.find((x) => x.id === a.bankId)?.name ?? BANK_APPLICATION_INFO.find((x) => x.bankId === a.bankId)?.bankName ?? a.bankId;
              const pn = ONBOARDING_PRODUCTS.find((x) => x.id === a.productId)?.name ?? a.productId;
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-ink-900">{bn} · {pn}</p>
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

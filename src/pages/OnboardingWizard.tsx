import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BankAvatar } from "@/components/ui/BankAvatar";
import {
  ACCOUNTS,
  BANKS,
  BANK_ONBOARDING,
  COMMON_ONBOARDING_CAUTIONS,
  COMPANY_DETAILS,
  bankOf,
} from "@/lib/mockData";
import type { BankId } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Banka" },
  { n: 2, label: "Bilgi formu" },
  { n: 3, label: "Çıktı & gönderim" },
  { n: 4, label: "İzin" },
  { n: 5, label: "Bitti" },
];

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
  ais: boolean;
  pis: boolean;
  consentMonths: string;
}

const CONSENT_OPTIONS = ["3", "6", "12"];

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [form, setForm] = useState<FormState>({
    ...COMPANY_DETAILS,
    ais: true,
    pis: false,
    consentMonths: "6",
  });
  const [includedIbans, setIncludedIbans] = useState<Set<string>>(new Set());

  const bank = BANKS.find((b) => b.id === selectedBank);
  const onboarding = selectedBank ? BANK_ONBOARDING[selectedBank] : null;

  const bankAccounts = useMemo(
    () => ACCOUNTS.filter((a) => a.bankId === selectedBank && a.companyId === "demir-ticaret"),
    [selectedBank],
  );

  function chooseBank(id: BankId) {
    setSelectedBank(id);
    setIncludedIbans(new Set(ACCOUNTS.filter((a) => a.bankId === id && a.companyId === "demir-ticaret").map((a) => a.id)));
  }

  function toggleIban(id: string) {
    setIncludedIbans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConnect() {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 900));
    setConnecting(false);
    setStep(5);
  }

  function printForm() {
    if (!bank || !onboarding) return;
    const services = [form.ais && "Hesap Bilgisi Hizmeti (AIS)", form.pis && "Ödeme Emri Başlatma Hizmeti (TÖS / PIS)"]
      .filter(Boolean)
      .join(", ");
    const ibanRows = bankAccounts
      .filter((a) => includedIbans.has(a.id))
      .map((a) => `<tr><td>${a.label}</td><td class="mono">${a.iban}</td></tr>`)
      .join("");
    const row = (k: string, v: string) => `<tr><th>${k}</th><td>${v}</td></tr>`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${onboarding.formCode}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, Arial, sans-serif; color: #1c1a15; margin: 40px; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th, td { border: 1px solid #ccc; padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #f4f2ec; width: 34%; font-weight: 600; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 18px 0 6px; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; border-top: 1px solid #333; padding-top: 6px; font-size: 12px; }
  .note { font-size: 11px; color: #888; margin-top: 24px; }
</style></head><body>
  <h1>${onboarding.formName}</h1>
  <div class="sub">Form kodu: ${onboarding.formCode} · Düzenlenme: ${new Date().toLocaleDateString("tr-TR")}</div>
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
  <h2>Talep edilen hizmetler</h2>
  <table>
    ${row("Hizmetler", services || "—")}
    ${row("Rıza süresi", `${form.consentMonths} ay`)}
  </table>
  <h2>Kapsam hesapları</h2>
  <table><tr><th style="width:40%">Hesap</th><th>IBAN</th></tr>${ibanRows || '<tr><td colspan="2">—</td></tr>'}</table>
  <div class="sign"><div>Yetkili imza & kaşe</div><div>Tarih</div></div>
  <p class="note">Bu form Akort kurulum sihirbazı tarafından firma verileriyle otomatik oluşturulmuştur. Bankaya gönderilmeden önce yetkili tarafından imzalanmalıdır.</p>
</body></html>`;
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step > s.n ? "bg-brand-500 text-white" : step === s.n ? "bg-ink-900 text-white" : "bg-cream-200 text-muted"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </span>
            <span className={`hidden text-sm font-semibold sm:inline ${step >= s.n ? "text-ink-900" : "text-muted"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line sm:w-8" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <h2 className="font-display mb-1 text-center text-xl font-extrabold text-ink-900">Bankanı seç</h2>
          <p className="mb-6 text-center text-sm text-muted">Akort'a bağlamak istediğin bankayı seç.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BANKS.map((b) => (
              <button
                key={b.id}
                onClick={() => chooseBank(b.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selectedBank === b.id ? "border-brand-600 bg-brand-50" : "border-line hover:bg-cream-100"
                }`}
              >
                <BankAvatar bankId={b.id} />
                <span className="font-semibold text-ink-900">{b.name}</span>
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-6 w-full" disabled={!selectedBank} onClick={() => setStep(2)}>
            Devam et →
          </Button>
        </Card>
      )}

      {step === 2 && bank && onboarding && (
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <BankAvatar bankId={bank.id} />
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900">{onboarding.formName}</h2>
              <p className="text-xs text-muted">
                Form kodu {onboarding.formCode} · firma bilgileriniz otomatik dolduruldu, kontrol edip düzenleyebilirsiniz
              </p>
            </div>
          </div>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Firma bilgileri</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Firma unvanı" value={form.unvan} onChange={(v) => setForm((f) => ({ ...f, unvan: v }))} />
            <Field label="MERSIS no" value={form.mersisNo} onChange={(v) => setForm((f) => ({ ...f, mersisNo: v }))} />
            <Field label="Vergi dairesi" value={form.vergiDairesi} onChange={(v) => setForm((f) => ({ ...f, vergiDairesi: v }))} />
            <Field label="Vergi no" value={form.vergiNo} onChange={(v) => setForm((f) => ({ ...f, vergiNo: v }))} />
            <div className="sm:col-span-2">
              <Field label="Adres" value={form.adres} onChange={(v) => setForm((f) => ({ ...f, adres: v }))} />
            </div>
          </div>

          <p className="mb-3 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">Yetkili kişi</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ad soyad" value={form.yetkili} onChange={(v) => setForm((f) => ({ ...f, yetkili: v }))} />
            <Field label="Ünvan" value={form.yetkiliUnvan} onChange={(v) => setForm((f) => ({ ...f, yetkiliUnvan: v }))} />
            <Field label="T.C. Kimlik No" value={form.yetkiliTckn} onChange={(v) => setForm((f) => ({ ...f, yetkiliTckn: v }))} />
            <Field label="Telefon" value={form.telefon} onChange={(v) => setForm((f) => ({ ...f, telefon: v }))} />
            <Field label="E-posta" value={form.eposta} onChange={(v) => setForm((f) => ({ ...f, eposta: v }))} />
            <Field label="KEP adresi" value={form.kep} onChange={(v) => setForm((f) => ({ ...f, kep: v }))} />
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">Talep edilen hizmetler</p>
          <div className="space-y-2">
            <CheckRow
              checked={form.ais}
              onChange={() => setForm((f) => ({ ...f, ais: !f.ais }))}
              title="Hesap Bilgisi Hizmeti (AIS)"
              desc="Bakiye ve hareketleri okuma"
            />
            <CheckRow
              checked={form.pis}
              onChange={() => setForm((f) => ({ ...f, pis: !f.pis }))}
              title="Ödeme Emri Başlatma Hizmeti (TÖS / PIS)"
              desc="Akort üzerinden ödeme tetikleme — ek risk onayı gerektirir"
            />
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Rıza süresi</span>
            <select
              value={form.consentMonths}
              onChange={(e) => setForm((f) => ({ ...f, consentMonths: e.target.value }))}
              className="input sm:w-48"
            >
              {CONSENT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} ay
                </option>
              ))}
            </select>
          </label>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">Kapsam hesapları</p>
          {bankAccounts.length === 0 ? (
            <p className="rounded-xl bg-cream-100 px-3 py-2.5 text-xs text-muted">
              Bu banka için tanımlı hesap yok; başvuru sonrası hesaplar eşlenecektir.
            </p>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <input type="checkbox" checked={includedIbans.has(a.id)} onChange={() => toggleIban(a.id)} className="h-4 w-4 accent-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{a.label}</p>
                    <p className="truncate font-mono text-xs text-muted">{a.iban}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              ← Geri
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setStep(3)}>
              Formu hazırla →
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && bank && onboarding && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-ink-900">Başvuru formu hazır</h2>
                <p className="text-xs text-muted">{onboarding.formName} · {onboarding.formCode}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={printForm}>
                🖨 Formu yazdır / PDF
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-line bg-cream-100 p-4 text-sm">
              <SummaryRow label="Firma" value={`${form.unvan} · VKN ${form.vergiNo}`} />
              <SummaryRow label="Yetkili" value={`${form.yetkili} · ${form.yetkiliUnvan}`} />
              <SummaryRow
                label="Hizmetler"
                value={
                  [form.ais && "Hesap bilgisi (AIS)", form.pis && "Ödeme emri (TÖS)"].filter(Boolean).join(", ") || "—"
                }
              />
              <SummaryRow label="Rıza süresi" value={`${form.consentMonths} ay`} />
              <SummaryRow
                label="Kapsam"
                value={`${bankAccounts.filter((a) => includedIbans.has(a.id)).length} hesap / IBAN`}
              />
            </div>
          </Card>

          <Card>
            <h3 className="font-display mb-1 text-base font-extrabold text-ink-900">Bankaya gönderirken dikkat edilecekler</h3>
            <p className="mb-4 text-xs text-muted">
              {bankOf(bank.id).name} · gönderim kanalı: <span className="font-semibold text-ink-900">{onboarding.channel}</span>{" "}
              · KEP: <span className="font-mono">{onboarding.kep}</span> · işlem süresi ~{onboarding.processDays}
            </p>
            <ul className="space-y-2">
              {[...onboarding.cautions, ...COMMON_ONBOARDING_CAUTIONS].map((c, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg bg-cream-100 px-3 py-2.5 text-sm text-ink-900">
                  <span className="shrink-0 text-warning-700">!</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← Formu düzenle
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setStep(4)}>
                İzin adımına geç →
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 4 && bank && (
        <Card className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <BankAvatar bankId={bank.id} size="lg" />
          </div>
          <h2 className="font-display mb-3 text-xl font-extrabold text-ink-900">{bank.name}'na izin ver</h2>
          <p className="mx-auto mb-5 max-w-sm text-sm leading-relaxed text-muted">
            Başvuru formu onaylandıktan sonra {bank.shortName}'in kendi sayfasında mobil bankacılık şifrenle giriş yapıp
            Akort'un hesap hareketlerini <span className="font-bold text-ink-900">okumasına</span> izin vereceksin. Şifreni
            asla görmeyiz.
          </p>

          <div className="space-y-2 text-left">
            <Rule ok text="Hesap bakiyeni ve hareketlerini görebiliriz" />
            <Rule ok text={`İzin ${form.consentMonths} ay geçerli, istediğin an iptal edebilirsin`} />
            <Rule text={form.pis ? "Ödeme emri yetkisi yalnızca çift onayla kullanılır" : "Para gönderemeyiz, şifreni göremeyiz"} />
          </div>

          <Button variant="primary" className="mt-5 w-full" disabled={connecting} onClick={handleConnect}>
            {connecting ? `${bank.shortName}'e yönlendiriliyor…` : `${bank.shortName}'e git ve izin ver →`}
          </Button>
          <p className="mt-3 text-xs text-muted">TCMB Açık Bankacılık Servisi üzerinden, BDDK düzenlemelerine uygun</p>
        </Card>
      )}

      {step === 5 && bank && (
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-600">
            ✓
          </div>
          <h2 className="font-display mb-2 text-xl font-extrabold text-ink-900">Bağlantı tamam!</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted">
            {bank.name} hesapların Akort'a bağlandı. İlk senkron tamamlandı, hareketlerin Genel bakış'ta seni bekliyor.
          </p>
          <div className="mb-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-cream-100 p-3">
              <p className="text-xs text-muted">Bağlanan hesap</p>
              <p className="font-display text-lg font-extrabold text-ink-900">
                {bankAccounts.filter((a) => includedIbans.has(a.id)).length || bankAccounts.length}
              </p>
            </div>
            <div className="rounded-xl bg-cream-100 p-3">
              <p className="text-xs text-muted">İlk senkron</p>
              <p className="font-display text-lg font-extrabold text-brand-500">Tamamlandı</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="primary" className="w-full">
              Genel bakışa git →
            </Button>
          </Link>
        </Card>
      )}
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

function CheckRow({ checked, onChange, title, desc }: { checked: boolean; onChange: () => void; title: string; desc: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <div>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function Rule({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-cream-100 px-3 py-2.5 text-sm text-ink-900">
      <span className={ok ? "text-brand-500" : "text-negative-700"}>{ok ? "✓" : "✕"}</span>
      {text}
    </div>
  );
}

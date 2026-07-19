import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { BANKS } from "@/lib/mockData";
import type { BankId } from "@/lib/types";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Bankanı seç" },
  { n: 2, label: "İzin ver" },
  { n: 3, label: "Bitti" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);
  const [connecting, setConnecting] = useState(false);

  const bank = BANKS.find((b) => b.id === selectedBank);

  async function handleConnect() {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 900));
    setConnecting(false);
    setStep(3);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center justify-center gap-3">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step > s.n
                    ? "bg-brand-500 text-white"
                    : step === s.n
                      ? "bg-ink-900 text-white"
                      : "bg-cream-200 text-muted"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </span>
              <span className={`text-sm font-semibold ${step >= s.n ? "text-ink-900" : "text-muted"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-10 bg-line" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <h2 className="font-display mb-1 text-center text-xl font-extrabold text-ink-900">Bankanı seç</h2>
          <p className="mb-6 text-center text-sm text-muted">Akort'a bağlamak istediğin bankayı seç.</p>
          <div className="grid grid-cols-2 gap-3">
            {BANKS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBank(b.id)}
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

      {step === 2 && bank && (
        <Card className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <BankAvatar bankId={bank.id} size="lg" />
          </div>
          <h2 className="font-display mb-3 text-xl font-extrabold text-ink-900">{bank.name}'na izin ver</h2>
          <p className="mx-auto mb-5 max-w-sm text-sm leading-relaxed text-muted">
            Şimdi seni {bank.shortName}'in kendi sayfasına götüreceğiz. Orada mobil bankacılık şifrenle giriş yapıp
            Akort'un hesap hareketlerini <span className="font-bold text-ink-900">okumasına</span> izin vereceksin.
            Şifreni asla görmeyiz, para transferi yapamayız.
          </p>

          <div className="space-y-2 text-left">
            <Rule ok text="Hesap bakiyeni ve hareketlerini görebiliriz" />
            <Rule ok text="İzin 6 ay geçerli, istediğin an iptal edebilirsin" />
            <Rule text="Para gönderemeyiz, şifreni göremeyiz" />
          </div>

          <Button variant="primary" className="mt-5 w-full" disabled={connecting} onClick={handleConnect}>
            {connecting ? `${bank.shortName}'e yönlendiriliyor…` : `${bank.shortName}'e git ve izin ver →`}
          </Button>
          <p className="mt-3 text-xs text-muted">TCMB Açık Bankacılık Servisi üzerinden, BDDK düzenlemelerine uygun</p>
        </Card>
      )}

      {step === 3 && bank && (
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-600">
            ✓
          </div>
          <h2 className="font-display mb-2 text-xl font-extrabold text-ink-900">Bağlantı tamam!</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted">
            {bank.name} hesapların Akort'a bağlandı. İlk senkron tamamlandı, hareketlerin Genel bakış'ta seni
            bekliyor.
          </p>
          <div className="mb-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-cream-100 p-3">
              <p className="text-xs text-muted">Bağlanan hesap</p>
              <p className="font-display text-lg font-extrabold text-ink-900">2</p>
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

function Rule({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-cream-100 px-3 py-2.5 text-sm text-ink-900">
      <span className={ok ? "text-brand-500" : "text-negative-700"}>{ok ? "✓" : "✕"}</span>
      {text}
    </div>
  );
}

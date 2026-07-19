import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { TOTAL_BALANCE } from "@/lib/mockData";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[280px] shrink-0 rounded-[36px] border-8 border-ink-900 bg-white shadow-xl">
      <div className="flex items-center justify-between px-5 pb-2 pt-4 text-xs font-semibold text-ink-900">
        <span>9:41</span>
        <div className="h-4 w-24 rounded-full bg-ink-900" />
        <span className="text-[10px]">100%</span>
      </div>
      <div className="min-h-[480px] px-4 pb-6">{children}</div>
    </div>
  );
}

export function MobileShowcase() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Akort mobil uygulaması hesap özetini, mutabakat kararlarını ve asistanı cebinize taşır. Kaydır-onayla ile
        mutabakat, yolda bile bitirilir.
      </p>

      <div className="flex flex-wrap justify-center gap-8">
        <PhoneFrame>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-sm font-extrabold text-ink-900">Akort</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-600">4 banka</span>
          </div>
          <div className="rounded-2xl bg-ink-900 p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Toplam bakiye</p>
            <Money value={TOTAL_BALANCE} size="lg" className="text-white" />
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-lg bg-white/10 p-2">
                <p className="text-[10px] text-white/60">Bugün gelen</p>
                <p className="text-sm font-bold text-brand-400">+₺86.340</p>
              </div>
              <div className="flex-1 rounded-lg bg-white/10 p-2">
                <p className="text-[10px] text-white/60">Bugün giden</p>
                <p className="text-sm font-bold text-negative-100">−₺31.750</p>
              </div>
            </div>
          </div>
          <p className="mb-2 mt-4 text-xs font-bold text-ink-900">Son hareketler</p>
          <div className="space-y-2 text-sm">
            {[
              ["Karadeniz Gıda", "+₺42.180"],
              ["SGK Prim", "−₺28.300"],
              ["Anadolu Ambalaj", "−₺46.600"],
            ].map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2">
                <span className="text-ink-900/80">{label}</span>
                <span className={`font-bold tabular ${amount.startsWith("+") ? "text-brand-500" : "text-negative-700"}`}>
                  {amount}
                </span>
              </div>
            ))}
          </div>
        </PhoneFrame>

        <PhoneFrame>
          <p className="font-display mb-1 text-sm font-extrabold text-ink-900">Mutabakat</p>
          <p className="mb-4 text-xs text-muted">Tek elle, kaydır-onayla</p>
          <div className="rounded-2xl border border-line p-4">
            <p className="mb-1 text-[11px] text-muted">ZIRAAT ····4417 · 15 Tem</p>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-ink-900">Aksa Yapı Malz.</span>
              <span className="font-bold text-brand-500">+₺57.820</span>
            </div>
            <div className="mb-3 rounded-lg bg-brand-50 p-2.5 text-[11px] text-ink-900/80">
              <span className="font-bold">AI önerisi:</span> FTR-2026-1184 · Aksa Yapı · ₺57.820 · %98 uyum
            </div>
            <Button variant="primary" className="mb-2 w-full">
              ✓ Eşleştir
            </Button>
            <Button variant="secondary" className="w-full">
              Başka aday göster
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted">1 / 12 istisna · gerisi otomatik eşleşti</p>

          <div className="mt-4 rounded-xl bg-cream-100 p-3">
            <p className="mb-1 text-[11px] font-bold text-ink-900">08:30 · Günlük özet (WhatsApp)</p>
            <p className="text-[11px] text-muted">
              Günaydın! Dün <span className="font-bold text-brand-500">+₺112.400</span> girdi,{" "}
              <span className="font-bold text-negative-700">−₺67.100</span> çıktı. Bugün SGK ödemesi var (₺28.300). 2
              hareket onayını bekliyor.
            </p>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

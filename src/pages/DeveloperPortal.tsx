import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/format";
import type { ApiEnvironment, WebhookEvent } from "@/lib/types";

const ALL_EVENTS: WebhookEvent[] = [
  "payment.completed",
  "payment.rejected",
  "collection.paid",
  "consent.expiring",
  "reconciliation.matched",
];

const DOC_ENDPOINTS = [
  { m: "GET", p: "/v1/accounts", d: "Hesapları ve bakiye tiplerini listele" },
  { m: "GET", p: "/v1/accounts/{id}/transactions", d: "Hesap hareketleri (sayfalı)" },
  { m: "POST", p: "/v1/payments", d: "Ödeme başlat (idempotency-key başlığı ile)" },
  { m: "POST", p: "/v1/payments/confirm-payee", d: "Confirmation of Payee" },
  { m: "POST", p: "/v1/collections/pay-by-bank", d: "A2A tahsilat talebi oluştur" },
  { m: "POST", p: "/v1/recurring", d: "Otomatik ödeme / VRP talimatı" },
  { m: "GET", p: "/v1/reconciliation/match", d: "AI ERP eşleştirme adayları" },
];

export function DeveloperPortal() {
  const banking = useBanking();
  const { data: keys, refetch: refetchKeys } = useAsync(() => banking.getApiKeys(), []);
  const { data: webhooks, refetch: refetchHooks } = useAsync(() => banking.getWebhooks(), []);
  const { data: deliveries, refetch: refetchDeliveries } = useAsync(() => banking.getWebhookDeliveries(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const activeKeys = keys?.filter((k) => !k.revoked).length ?? 0;
  const successRate = deliveries && deliveries.length > 0
    ? Math.round((deliveries.filter((d) => d.status === "success").length / deliveries.length) * 100)
    : 100;

  async function act(id: string, fn: () => Promise<void>, ...refetches: (() => void)[]) {
    setBusyId(id);
    await fn();
    setBusyId(null);
    refetches.forEach((r) => r());
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Aktif API anahtarı" value={activeKeys} hint={`${keys?.length ?? 0} toplam`} />
        <StatTile label="Webhook aboneliği" value={webhooks?.filter((w) => w.active).length ?? "…"} hint="aktif uç nokta" />
        <StatTile label="Teslim başarı oranı" value={`%${successRate}`} tone={successRate >= 95 ? "positive" : "negative"} hint="son teslimler" />
        <StatTile label="Ortam" value="Sandbox + Üretim" hint="ayrı anahtarlar" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API anahtarları */}
        <Card>
          <CardHeader>
            <CardTitle>API anahtarları</CardTitle>
          </CardHeader>
          <NewApiKeyForm
            onCreated={(secret) => {
              setNewSecret(secret);
              refetchKeys();
            }}
          />
          {newSecret && (
            <div className="mb-3 rounded-xl bg-ink-900 p-3 text-xs text-white">
              <p className="mb-1 font-bold">Gizli anahtar (yalnızca bir kez gösterilir):</p>
              <p className="break-all font-mono text-brand-400">{newSecret}</p>
              <button className="mt-2 text-[11px] underline" onClick={() => setNewSecret(null)}>
                Kopyaladım, gizle
              </button>
            </div>
          )}
          {!keys ? (
            <LoadingRows rows={3} />
          ) : (
            <div className="divide-y divide-line">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">{k.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted">{k.prefix} · {k.scopes.join(", ")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={k.environment === "production" ? "brand" : "neutral"}>
                      {k.environment === "production" ? "Üretim" : "Sandbox"}
                    </Badge>
                    {k.revoked ? (
                      <Badge tone="negative">İptal</Badge>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === k.id}
                        onClick={() => act(k.id, () => banking.revokeApiKey(k.id), refetchKeys)}
                        className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-negative-700 hover:bg-negative-100 disabled:opacity-50"
                      >
                        İptal et
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook uç noktaları</CardTitle>
          </CardHeader>
          <NewWebhookForm onCreated={refetchHooks} />
          {!webhooks ? (
            <LoadingRows rows={2} />
          ) : (
            <div className="divide-y divide-line">
              {webhooks.map((w) => (
                <div key={w.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-xs text-ink-900">{w.url}</p>
                    <Badge tone={w.active ? "positive" : "neutral"}>{w.active ? "Aktif" : "Pasif"}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{w.events.join(" · ")} · {w.secretMasked}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === w.id}
                      onClick={() => act(w.id, () => banking.setWebhookActive(w.id, !w.active), refetchHooks)}
                      className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                    >
                      {w.active ? "Duraklat" : "Etkinleştir"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === w.id}
                      onClick={() => act(w.id, () => banking.deleteWebhook(w.id), refetchHooks)}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-negative-700 hover:bg-negative-100 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Teslim günlüğü */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook teslim günlüğü</CardTitle>
            <span className="text-xs text-muted">otomatik yeniden deneme + manuel</span>
          </CardHeader>
          {!deliveries ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="divide-y divide-line">
              {deliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-ink-900">{d.event}</p>
                    <p className="text-[11px] text-muted">
                      {formatDateTime(d.at)} · {d.attempts} deneme{d.statusCode ? ` · HTTP ${d.statusCode}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={d.status === "success" ? "positive" : d.status === "failed" ? "negative" : "warning"}>
                      {d.status === "success" ? "Başarılı" : d.status === "failed" ? "Başarısız" : "Bekliyor"}
                    </Badge>
                    {d.status === "failed" && (
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => act(d.id, () => banking.redeliverWebhook(d.id), refetchDeliveries)}
                        className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                      >
                        Yeniden gönder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dokümantasyon */}
        <Card>
          <CardHeader>
            <CardTitle>API dokümantasyonu</CardTitle>
            <span className="text-xs text-muted">REST · OAuth2 · idempotency</span>
          </CardHeader>
          <div className="divide-y divide-line">
            {DOC_ENDPOINTS.map((e) => (
              <div key={e.p} className="flex items-center gap-3 py-2">
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    e.m === "GET" ? "bg-brand-100 text-brand-600" : "bg-cream-200 text-ink-900"
                  }`}
                >
                  {e.m}
                </span>
                <code className="shrink-0 font-mono text-xs text-ink-900">{e.p}</code>
                <span className="truncate text-xs text-muted">{e.d}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NewApiKeyForm({ onCreated }: { onCreated: (secret: string) => void }) {
  const banking = useBanking();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<ApiEnvironment>("sandbox");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name) return;
    setSaving(true);
    const res = await banking.createApiKey({ name, environment, scopes: ["accounts:read", "payments:write", "webhooks"] });
    setSaving(false);
    setName("");
    onCreated(res.secret);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anahtar adı (ör. ERP)" />
      <select className="input w-32" value={environment} onChange={(e) => setEnvironment(e.target.value as ApiEnvironment)}>
        <option value="sandbox">Sandbox</option>
        <option value="production">Üretim</option>
      </select>
      <Button variant="primary" disabled={!name || saving} onClick={submit}>
        {saving ? "…" : "Oluştur"}
      </Button>
    </div>
  );
}

function NewWebhookForm({ onCreated }: { onCreated: () => void }) {
  const banking = useBanking();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["payment.completed"]);
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: WebhookEvent) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function submit() {
    if (!url || events.length === 0) return;
    setSaving(true);
    await banking.createWebhook({ url, events });
    setSaving(false);
    setUrl("");
    setEvents(["payment.completed"]);
    onCreated();
  }

  return (
    <div className="mb-3 space-y-2">
      <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... webhook URL" />
      <div className="flex flex-wrap gap-1.5">
        {ALL_EVENTS.map((ev) => (
          <button
            key={ev}
            type="button"
            onClick={() => toggleEvent(ev)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
              events.includes(ev) ? "bg-brand-500 text-white" : "bg-cream-100 text-muted hover:text-ink-900"
            }`}
          >
            {ev}
          </button>
        ))}
      </div>
      <Button variant="primary" className="w-full" disabled={!url || events.length === 0 || saving} onClick={submit}>
        {saving ? "Ekleniyor…" : "Webhook ekle"}
      </Button>
    </div>
  );
}

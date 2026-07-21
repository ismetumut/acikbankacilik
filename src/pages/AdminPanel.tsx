import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { API_HUB_STATS, ERP_INTEGRATIONS } from "@/lib/mockData";
import type { BadgeTone } from "@/components/ui/Badge";
import type { ErpIntegration } from "@/lib/mockData";

const STATUS_TONE: Record<ErpIntegration["status"], BadgeTone> = {
  Aktif: "positive",
  Beta: "warning",
  Yakında: "neutral",
};

const PROTOCOL_FILTERS = ["Tümü", "REST", "SOAP"] as const;

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildMarkdown(erp: ErpIntegration): string {
  const endpointRows = erp.endpoints.map((e) => `| ${e.method} | \`${e.path}\` | ${e.desc} |`).join("\n");
  const sampleReq =
    erp.protocol === "REST"
      ? `\`\`\`http\nGET ${erp.baseUrl}/api/v1/cari?limit=50\nAuthorization: Bearer <token>\nX-Firma-No: 001\nAccept: application/json\n\`\`\``
      : `\`\`\`xml\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">\n  <soapenv:Header/>\n  <soapenv:Body>\n    <GetCariListesi>\n      <FirmaNo>001</FirmaNo>\n      <Donem>2026</Donem>\n    </GetCariListesi>\n  </soapenv:Body>\n</soapenv:Envelope>\n\`\`\``;
  const sampleRes =
    erp.format === "JSON"
      ? `\`\`\`json\n{\n  "cari": [\n    { "kod": "120.001", "unvan": "Anadolu Ambalaj San. A.Ş.", "bakiye": -46600.00, "para": "TRY" }\n  ],\n  "toplam": 1\n}\n\`\`\``
      : `\`\`\`xml\n<Cari>\n  <Kod>120.001</Kod>\n  <Unvan>Anadolu Ambalaj San. A.Ş.</Unvan>\n  <Bakiye>-46600.00</Bakiye>\n</Cari>\n\`\`\``;

  return `# ${erp.name} — Web Servis Entegrasyon Dokümanı

> Akort · Açık Bankacılık — API Hub
> Üretici: ${erp.vendor} · Kategori: ${erp.category} · Durum: ${erp.status}

## 1. Genel bilgiler

| Alan | Değer |
| --- | --- |
| Protokol | ${erp.protocol} |
| Sürüm | ${erp.version} |
| Base URL | \`${erp.baseUrl}\` |
| Kimlik doğrulama | ${erp.auth} |
| Veri formatı | ${erp.format} |

${erp.note}

## 2. Kimlik doğrulama

Entegrasyon ${erp.auth} yöntemini kullanır. Kimlik bilgileri Akort › Admin panel › API anahtarları üzerinden
oluşturulur ve her istekte iletilir. Üretim ortamında IP kısıtlaması ve TLS 1.2+ zorunludur.

## 3. Uç noktalar

| Metod | Yol / Operasyon | Açıklama |
| --- | --- | --- |
${endpointRows}

## 4. Örnek istek

${sampleReq}

## 5. Örnek yanıt

${sampleRes}

## 6. Hata kodları

| Kod | Anlamı |
| --- | --- |
| 200 / OK | Başarılı |
| 401 | Kimlik doğrulama hatası (token süresi dolmuş olabilir) |
| 403 | Yetkisiz firma / dönem |
| 409 | Kayıt zaten mevcut (idempotency) |
| 422 | Doğrulama hatası (zorunlu alan eksik) |
| 500 | ERP tarafı hatası — destek ile iletişime geçin |

---
_Bu doküman Akort API Hub tarafından otomatik oluşturulmuştur · ${new Date().toLocaleDateString("tr-TR")}_
`;
}

function buildOpenApi(erp: ErpIntegration): string {
  const paths: Record<string, unknown> = {};
  for (const e of erp.endpoints) {
    paths[e.path] = {
      [e.method.toLowerCase()]: {
        summary: e.desc,
        responses: { "200": { description: "Başarılı" } },
      },
    };
  }
  return JSON.stringify(
    {
      openapi: "3.0.3",
      info: { title: `${erp.name} — Akort Entegrasyonu`, version: erp.version },
      servers: [{ url: erp.baseUrl }],
      components: { securitySchemes: { auth: { type: "http", scheme: "bearer", description: erp.auth } } },
      security: [{ auth: [] }],
      paths,
    },
    null,
    2,
  );
}

function buildWsdl(erp: ErpIntegration): string {
  const ops = erp.endpoints
    .map((e) => `    <operation name="${e.path}"><!-- ${e.desc} --></operation>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${erp.name} — Akort entegrasyon WSDL taslağı · ${erp.auth} -->
<definitions name="${erp.id}"
  targetNamespace="${erp.baseUrl}"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/">
  <portType name="${erp.id}PortType">
${ops}
  </portType>
  <service name="${erp.name.replace(/[^A-Za-z0-9]/g, "")}">
    <port name="${erp.id}Port"><soap:address location="${erp.baseUrl}"/></port>
  </service>
</definitions>
`;
}

export function AdminPanel() {
  const [protocolFilter, setProtocolFilter] = useState<(typeof PROTOCOL_FILTERS)[number]>("Tümü");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ERP_INTEGRATIONS.filter((e) => {
      if (protocolFilter !== "Tümü" && e.protocol !== protocolFilter) return false;
      if (term && !`${e.name} ${e.vendor} ${e.category}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [protocolFilter, search]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Bağlı ERP" value={API_HUB_STATS.connectedErp} hint={`${ERP_INTEGRATIONS.length} entegrasyon mevcut`} />
        <StatTile label="Aktif uç nokta" value={API_HUB_STATS.activeEndpoints} hint="REST + SOAP" />
        <StatTile label="Aylık API çağrısı" value={API_HUB_STATS.monthlyCalls} hint="son 30 gün" />
        <StatTile label="Ort. yanıt süresi" value={`${API_HUB_STATS.avgLatencyMs} ms`} hint="p95 · sağlıklı" tone="positive" />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>API Hub</CardTitle>
            <p className="text-xs text-muted">
              Tüm ERP'ler için web servis dokümanları — Markdown, OpenAPI (REST) veya WSDL (SOAP) olarak indirin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ERP ara…"
              className="input w-40 sm:w-52"
            />
            <div className="flex gap-1 rounded-xl bg-cream-100 p-1">
              {PROTOCOL_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProtocolFilter(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    protocolFilter === p ? "bg-white text-ink-900 shadow-sm" : "text-ink-900/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((erp) => {
            const isOpen = expanded === erp.id;
            return (
              <div key={erp.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                      style={{ backgroundColor: erp.colorHex }}
                    >
                      {erp.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-ink-900">{erp.name}</p>
                      <p className="truncate text-xs text-muted">
                        {erp.vendor} · {erp.category}
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[erp.status]}>{erp.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip>{erp.protocol}</Chip>
                  <Chip>{erp.version}</Chip>
                  <Chip>{erp.format}</Chip>
                  <Chip>{erp.auth}</Chip>
                </div>

                <button
                  onClick={() => setExpanded(isOpen ? null : erp.id)}
                  className="mt-3 text-xs font-semibold text-brand-500 hover:underline"
                >
                  {isOpen ? "Uç noktaları gizle ▲" : `${erp.endpoints.length} uç noktayı gör ▼`}
                </button>

                {isOpen && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-line">
                        {erp.endpoints.map((e, i) => (
                          <tr key={i}>
                            <td className="w-16 whitespace-nowrap px-3 py-2 font-mono font-bold text-brand-600">{e.method}</td>
                            <td className="px-3 py-2 font-mono text-ink-900/80">{e.path}</td>
                            <td className="hidden px-3 py-2 text-muted sm:table-cell">{e.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => download(`${erp.id}-web-servis.md`, buildMarkdown(erp), "text/markdown;charset=utf-8")}
                    disabled={erp.status === "Yakında"}
                  >
                    ↓ Doküman (.md)
                  </Button>
                  {erp.protocol === "REST" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => download(`${erp.id}-openapi.json`, buildOpenApi(erp), "application/json;charset=utf-8")}
                      disabled={erp.status === "Yakında"}
                    >
                      ↓ OpenAPI (.json)
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => download(`${erp.id}.wsdl`, buildWsdl(erp), "application/xml;charset=utf-8")}
                      disabled={erp.status === "Yakında"}
                    >
                      ↓ WSDL (.xml)
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Aramanızla eşleşen ERP bulunamadı.</p>
        )}
      </Card>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] font-semibold text-ink-900/70">{children}</span>
  );
}

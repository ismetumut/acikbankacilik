import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/BankAvatar";
import { formatCurrency } from "@/lib/format";
import { ASSISTANT_SUGGESTIONS } from "@/lib/mockData";
import type { AssistantExchange } from "@/lib/types";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz"];
const BAR_HEIGHTS = [0.42, 0.55, 0.61, 0.7, 0.8, 1];

export function Assistant() {
  const banking = useBanking();
  const { data: initial } = useAsync(() => banking.askAssistant(""), []);
  const [history, setHistory] = useState<AssistantExchange[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const exchanges = history.length > 0 ? history : initial ? [initial] : [];
  const latest = exchanges[0];

  async function ask(q: string) {
    if (!q.trim() || asking) return;
    setAsking(true);
    const result = await banking.askAssistant(q);
    setHistory((h) => [result, ...h]);
    setQuestion("");
    setAsking(false);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {latest && (
        <>
          <div className="flex justify-end">
            <div className="max-w-lg rounded-2xl rounded-tr-sm bg-ink-900 px-5 py-3 text-sm font-medium text-white">
              {latest.question}
            </div>
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted">
              <InitialsAvatar initials="A" size="sm" />
              <span>
                {latest.answeredAt} · {latest.scannedAccounts} hesap tarandı · {(latest.responseMs / 1000).toFixed(1)} sn
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-900">{latest.answer}</p>

            {latest.rows.length > 0 && (
              <div className="mt-4 divide-y divide-line border-t border-line">
                {latest.rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted">
                      {r.date} · {r.channel} · {r.ref}
                    </span>
                    <span className="font-bold tabular text-ink-900">{formatCurrency(r.amount, { withDecimals: false })}</span>
                  </div>
                ))}
              </div>
            )}

            {latest.rows.length > 0 && (
              <div className="mt-5 flex gap-3">
                {MONTHS.map((m, i) => (
                  <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-24 w-full items-end">
                      <div
                        className={`w-full rounded-t-md ${i === MONTHS.length - 1 ? "bg-ink-900" : "bg-cream-200"}`}
                        style={{ height: `${BAR_HEIGHTS[i] * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted">{m}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {ASSISTANT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-cream-100"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Hesap hareketlerin hakkında soru sor…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-ink-900 placeholder:text-muted focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={asking || !question.trim()}>
          {asking ? "…" : "Sor"}
        </Button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "./nav";
import { InitialsAvatar } from "@/components/ui/BankAvatar";
import { ALL_COMPANIES, COMPANIES, COMPANY, companyOf } from "@/lib/mockData";
import { useBanking } from "@/banking/context";
import { useCompany } from "@/company/context";
import { useAsync } from "@/lib/useAsync";

interface Props {
  open: boolean;
  onClose: () => void;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Sidebar({ open, onClose }: Props) {
  const banking = useBanking();
  const { companyId, setCompanyId } = useCompany();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { data: approvals } = useAsync(() => banking.getPendingApprovals(), []);
  const { data: exceptions } = useAsync(() => banking.getReconciliationExceptions(), []);
  const { data: consents } = useAsync(() => banking.getConsents(), []);

  const badgeCounts: Record<string, number | undefined> = {
    approvals: approvals?.length,
    reconciliation: exceptions?.length,
    consents: consents?.filter((c) => c.status === "expiring" || c.status === "expired").length,
  };

  const activeCompany = companyOf(companyId);
  const footerName = companyId === ALL_COMPANIES ? "Tüm grup" : (activeCompany?.name ?? COMPANY.name);
  const footerInitials = companyId === ALL_COMPANIES ? "TG" : initialsOf(activeCompany?.name ?? COMPANY.name);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[248px] shrink-0 -translate-x-full flex-col bg-ink-900 px-4 py-6 text-white/90 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-400 font-display text-lg font-extrabold text-ink-950">
            A
          </div>
          <div>
            <p className="font-display text-lg font-extrabold leading-none text-white">Akort</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Açık Bankacılık
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-white/35">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                          isActive ? "bg-white/10 font-bold text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <span>{item.label}</span>
                      {!!badgeValue && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-100 px-1 text-[11px] font-bold text-warning-700">
                          {badgeValue}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative mt-4 border-t border-white/10 pt-4">
          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} aria-hidden="true" />
              <div className="absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-lg">
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Grup şirketleri
                </p>
                {COMPANIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(c.id);
                      setSwitcherOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/10 ${
                      companyId === c.id ? "text-white font-bold" : "text-white/75"
                    }`}
                  >
                    <InitialsAvatar initials={initialsOf(c.name)} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {companyId === c.id && <span className="text-brand-400">✓</span>}
                  </button>
                ))}
                <div className="border-t border-white/10">
                  <button
                    onClick={() => {
                      setCompanyId(ALL_COMPANIES);
                      setSwitcherOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/10 ${
                      companyId === ALL_COMPANIES ? "text-white font-bold" : "text-white/75"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-400/20 text-xs font-bold text-brand-400">
                      TG
                    </span>
                    <span className="flex-1">Tüm grup (konsolide)</span>
                    {companyId === ALL_COMPANIES && <span className="text-brand-400">✓</span>}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
          >
            <InitialsAvatar initials={footerInitials} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">{COMPANY.userName}</p>
              <p className="truncate text-[11.5px] text-white/50">{footerName}</p>
            </div>
            <span className="text-white/40">⌄</span>
          </button>
        </div>
      </aside>
    </>
  );
}

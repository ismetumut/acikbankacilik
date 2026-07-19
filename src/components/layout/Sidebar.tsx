import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "./nav";
import { InitialsAvatar } from "@/components/ui/BankAvatar";
import { COMPANY } from "@/lib/mockData";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const banking = useBanking();
  const { data: approvals } = useAsync(() => banking.getPendingApprovals(), []);
  const { data: exceptions } = useAsync(() => banking.getReconciliationExceptions(), []);
  const { data: consents } = useAsync(() => banking.getConsents(), []);

  const badgeCounts: Record<string, number | undefined> = {
    approvals: approvals?.length,
    reconciliation: exceptions?.length,
    consents: consents?.filter((c) => c.status === "expiring" || c.status === "expired").length,
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

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

        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <InitialsAvatar initials={COMPANY.userInitials} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{COMPANY.userName}</p>
            <p className="truncate text-[11.5px] text-white/50">{COMPANY.name}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

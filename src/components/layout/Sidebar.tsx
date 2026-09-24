import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { InitialsAvatar } from "@/components/ui/BankAvatar";
import { ALL_COMPANIES, COMPANIES, COMPANY, companyOf } from "@/lib/mockData";
import { useBanking } from "@/banking/context";
import { useCompany } from "@/company/context";
import { useAsync } from "@/lib/useAsync";
import { PRODUCTS, GLOBAL_TOOLS, productForPath, type MenuNode } from "@/lib/products";

interface Props {
  open: boolean;
  onClose: () => void;
}

function initialsOf(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function Sidebar({ open, onClose }: Props) {
  const banking = useBanking();
  const navigate = useNavigate();
  const { pathname } = useLocation();
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

  const activeProduct = productForPath(pathname) ?? PRODUCTS[0];
  const isGlobal = GLOBAL_TOOLS.some((t) => t.path === pathname);
  const menuTitle = isGlobal ? "Genel Araçlar" : activeProduct.name;
  const menuNodes: MenuNode[] = isGlobal ? GLOBAL_TOOLS : activeProduct.menu;

  const activeCompany = companyOf(companyId);
  const footerName = companyId === ALL_COMPANIES ? "Tüm grup" : activeCompany?.name ?? COMPANY.name;
  const footerInitials = companyId === ALL_COMPANIES ? "TG" : initialsOf(activeCompany?.name ?? COMPANY.name);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full shrink-0 -translate-x-full transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        {/* Ürün rayı */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 bg-brand-600 py-3">
          {PRODUCTS.map((p) => {
            const active = !isGlobal && activeProduct.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/${p.id}`)}
                title={p.name}
                className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg text-[10px] font-extrabold leading-none transition-colors ${
                  active ? "bg-white text-brand-600" : "text-white/85 hover:bg-white/15"
                }`}
              >
                {p.code}
              </button>
            );
          })}
          <div className="mt-auto flex flex-col items-center gap-1 border-t border-white/20 pt-2">
            {GLOBAL_TOOLS.map((t) => (
              <button
                key={t.path}
                type="button"
                onClick={() => t.path && navigate(t.path)}
                title={t.label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  t.path === pathname ? "bg-white text-brand-600" : "text-white/80 hover:bg-white/15"
                }`}
              >
                {t.label.includes("Geliştirici") ? "⌨" : t.label.includes("Admin") ? "⚙" : t.label.includes("Asistan") ? "✦" : "☰"}
              </button>
            ))}
          </div>
        </div>

        {/* Ürün menüsü */}
        <div className="flex w-[232px] flex-col bg-ink-900 px-3 py-5 text-white/90">
          <div className="mb-6 flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-400 font-display text-lg font-extrabold text-ink-950">
              A
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-extrabold leading-none text-white">Akort</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-brand-400">{menuTitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Menüyü kapat"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
            {menuNodes.map((node) =>
              node.children ? (
                <MenuGroup key={node.label} node={node} pathname={pathname} badgeCounts={badgeCounts} />
              ) : (
                <MenuLeaf key={node.path ?? node.label} node={node} badgeCounts={badgeCounts} />
              ),
            )}
          </nav>

          <CompanyFooter
            switcherOpen={switcherOpen}
            setSwitcherOpen={setSwitcherOpen}
            companyId={companyId}
            setCompanyId={setCompanyId}
            footerName={footerName}
            footerInitials={footerInitials}
          />
        </div>
      </aside>
    </>
  );
}

function MenuLeaf({ node, badgeCounts }: { node: MenuNode; badgeCounts: Record<string, number | undefined> }) {
  const badge = node.badgeKey ? badgeCounts[node.badgeKey] : undefined;
  const ready = !!node.comp;
  return (
    <NavLink
      to={node.path ?? "#"}
      end
      className={({ isActive }) =>
        `flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
          isActive ? "bg-white/10 font-bold text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span className="flex items-center gap-1.5">
        {node.label}
        {!ready && <span className="text-[9px] text-white/30">•</span>}
      </span>
      {!!badge && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-100 px-1 text-[11px] font-bold text-warning-700">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function MenuGroup({
  node,
  pathname,
  badgeCounts,
}: {
  node: MenuNode;
  pathname: string;
  badgeCounts: Record<string, number | undefined>;
}) {
  const hasActive = (node.children ?? []).some((c) => c.path === pathname);
  const [open, setOpen] = useState(hasActive);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/5"
      >
        <span>{node.label}</span>
        <span className={`text-white/40 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="ml-2 space-y-0.5 border-l border-white/10 pl-2">
          {node.children!.map((c) => (
            <MenuLeaf key={c.path ?? c.label} node={c} badgeCounts={badgeCounts} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyFooter({
  switcherOpen,
  setSwitcherOpen,
  companyId,
  setCompanyId,
  footerName,
  footerInitials,
}: {
  switcherOpen: boolean;
  setSwitcherOpen: (f: (v: boolean) => boolean) => void;
  companyId: string;
  setCompanyId: (id: string) => void;
  footerName: string;
  footerInitials: string;
}) {
  return (
    <div className="relative mt-4 border-t border-white/10 pt-4">
      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(() => false)} aria-hidden="true" />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-lg">
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Grup şirketleri</p>
            {COMPANIES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCompanyId(c.id);
                  setSwitcherOpen(() => false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-white/10 ${
                  companyId === c.id ? "font-bold text-white" : "text-white/75"
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
                  setSwitcherOpen(() => false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-white/10 ${
                  companyId === ALL_COMPANIES ? "font-bold text-white" : "text-white/75"
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
  );
}

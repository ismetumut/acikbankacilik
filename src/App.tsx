import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PRODUCTS, GLOBAL_TOOLS, type MenuNode } from "@/lib/products";

const Overview = lazy(() => import("@/pages/Overview").then((m) => ({ default: m.Overview })));
const Transactions = lazy(() => import("@/pages/Transactions").then((m) => ({ default: m.Transactions })));
const Balances = lazy(() => import("@/pages/Balances").then((m) => ({ default: m.Balances })));
const PaymentInitiation = lazy(() =>
  import("@/pages/PaymentInitiation").then((m) => ({ default: m.PaymentInitiation })),
);
const AutoPayments = lazy(() => import("@/pages/AutoPayments").then((m) => ({ default: m.AutoPayments })));
const Collections = lazy(() => import("@/pages/Collections").then((m) => ({ default: m.Collections })));
const Reconciliation = lazy(() => import("@/pages/Reconciliation").then((m) => ({ default: m.Reconciliation })));
const CashFlow = lazy(() => import("@/pages/CashFlow").then((m) => ({ default: m.CashFlow })));
const Assistant = lazy(() => import("@/pages/Assistant").then((m) => ({ default: m.Assistant })));
const Reports = lazy(() => import("@/pages/Reports").then((m) => ({ default: m.Reports })));
const Consents = lazy(() => import("@/pages/Consents").then((m) => ({ default: m.Consents })));
const ClientPanel = lazy(() => import("@/pages/ClientPanel").then((m) => ({ default: m.ClientPanel })));
const OnboardingWizard = lazy(() =>
  import("@/pages/OnboardingWizard").then((m) => ({ default: m.OnboardingWizard })),
);
const AdminPanel = lazy(() => import("@/pages/AdminPanel").then((m) => ({ default: m.AdminPanel })));
const DeveloperPortal = lazy(() => import("@/pages/DeveloperPortal").then((m) => ({ default: m.DeveloperPortal })));
const Placeholder = lazy(() => import("@/pages/Placeholder").then((m) => ({ default: m.Placeholder })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

/** products.ts `comp` anahtarı → gerçek bileşen. Eşleşmeyen → Placeholder. */
const COMPONENTS: Record<string, ComponentType> = {
  Overview,
  Transactions,
  Balances,
  PaymentInitiation,
  AutoPayments,
  Collections,
  Reconciliation,
  CashFlow,
  Assistant,
  Reports,
  Consents,
  ClientPanel,
  OnboardingWizard,
  AdminPanel,
  DeveloperPortal,
};

function collectLeaves(nodes: MenuNode[], acc: MenuNode[] = []): MenuNode[] {
  for (const n of nodes) {
    if (n.path) acc.push(n);
    if (n.children) collectLeaves(n.children, acc);
  }
  return acc;
}

const ALL_LEAVES = [
  ...PRODUCTS.flatMap((p) => collectLeaves(p.menu)),
  ...collectLeaves(GLOBAL_TOOLS),
];

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/nte" replace />} />
            {ALL_LEAVES.map((leaf) => {
              const Comp = leaf.comp ? COMPONENTS[leaf.comp] ?? Placeholder : Placeholder;
              return <Route key={leaf.path} path={leaf.path} element={<Comp />} />;
            })}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

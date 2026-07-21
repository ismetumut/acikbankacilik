import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

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
const MobileShowcase = lazy(() => import("@/pages/MobileShowcase").then((m) => ({ default: m.MobileShowcase })));
const AdminPanel = lazy(() => import("@/pages/AdminPanel").then((m) => ({ default: m.AdminPanel })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/hareketler" element={<Transactions />} />
            <Route path="/bakiyeler" element={<Balances />} />
            <Route path="/odeme-tetikleme" element={<PaymentInitiation />} />
            <Route path="/otomatik-odeme" element={<AutoPayments />} />
            <Route path="/tahsilat" element={<Collections />} />
            <Route path="/mutabakat" element={<Reconciliation />} />
            <Route path="/nakit-akisi" element={<CashFlow />} />
            <Route path="/asistan" element={<Assistant />} />
            <Route path="/raporlar" element={<Reports />} />
            <Route path="/rizalar" element={<Consents />} />
            <Route path="/musteri-paneli" element={<ClientPanel />} />
            <Route path="/kurulum" element={<OnboardingWizard />} />
            <Route path="/mobil" element={<MobileShowcase />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

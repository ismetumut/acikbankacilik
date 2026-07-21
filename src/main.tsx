import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BankingProviderRoot } from "@/banking/context";
import { CompanyProviderRoot } from "@/company/context";
import { AuthProviderRoot, useAuth } from "@/auth/context";
import { Login } from "@/pages/Login";

/** Gates the app behind login when a backend is configured; transparent otherwise. */
function AuthGate() {
  const { user, loading, authRequired } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-cream-100 text-sm text-muted">
        Yükleniyor…
      </div>
    );
  }
  if (authRequired && !user) return <Login />;

  return (
    <CompanyProviderRoot>
      <BankingProviderRoot>
        <App />
      </BankingProviderRoot>
    </CompanyProviderRoot>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProviderRoot>
      <AuthGate />
    </AuthProviderRoot>
  </StrictMode>,
);

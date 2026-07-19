import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BankingProviderRoot } from "@/banking/context";
import { CompanyProviderRoot } from "@/company/context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CompanyProviderRoot>
      <BankingProviderRoot>
        <App />
      </BankingProviderRoot>
    </CompanyProviderRoot>
  </StrictMode>,
);

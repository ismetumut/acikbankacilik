import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BankingProviderRoot } from "@/banking/context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BankingProviderRoot>
      <App />
    </BankingProviderRoot>
  </StrictMode>,
);

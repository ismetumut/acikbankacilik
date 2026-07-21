import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">
            © 2026 Trailie. Tüm hakları saklıdır.
          </footer>
        </main>
      </div>
    </div>
  );
}

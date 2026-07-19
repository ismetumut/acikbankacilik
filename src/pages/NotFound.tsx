import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-5xl font-extrabold text-ink-900">404</p>
      <p className="text-muted">Bu sayfa bulunamadı.</p>
      <Link to="/" className="mt-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
        Genel bakışa dön
      </Link>
    </div>
  );
}

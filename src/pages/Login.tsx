import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı. Bağlantıyı kontrol edin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-cream-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 font-display text-2xl font-extrabold text-ink-950">
            A
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-none text-ink-900">Akort</p>
            <p className="text-xs uppercase tracking-widest text-muted">Açık Bankacılık</p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="font-display text-lg font-bold text-ink-900">Hesabınıza giriş yapın</h1>
          <p className="mt-1 text-sm text-muted">Devam etmek için e-posta ve şifrenizi girin.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold text-ink-900">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-semibold text-ink-900">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-negative-100 px-3 py-2 text-sm text-negative-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? "Giriş yapılıyor…" : "Giriş yap"}
            </Button>
          </form>

          <p className="mt-5 rounded-lg bg-cream-100 px-3 py-2 text-xs leading-relaxed text-muted">
            <span className="font-semibold text-ink-900">Demo erişimi:</span> demo@akort.app · şifre{" "}
            <span className="font-mono">akort2026</span>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">© 2026 Trailie. Tüm hakları saklıdır.</p>
      </div>
    </div>
  );
}

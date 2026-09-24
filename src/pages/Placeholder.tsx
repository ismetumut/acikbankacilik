import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PRODUCTS, productForPath, type MenuNode } from "@/lib/products";

function findLabel(pathname: string): { title: string; product?: string } {
  for (const p of PRODUCTS) {
    const walk = (nodes: MenuNode[]): string | undefined => {
      for (const n of nodes) {
        if (n.path === pathname) return n.label;
        if (n.children) {
          const c = walk(n.children);
          if (c) return c;
        }
      }
      return undefined;
    };
    const l = walk(p.menu);
    if (l) return { title: l, product: p.name };
  }
  return { title: "Sayfa" };
}

export function Placeholder() {
  const { pathname } = useLocation();
  const { title, product } = findLabel(pathname);
  const prod = productForPath(pathname);

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200 text-2xl">🧩</div>
        <h2 className="font-display text-xl font-extrabold text-ink-900">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          {product ? `${product} · ` : ""}bu modül hazırlanıyor
        </p>
        <p className="mt-4 max-w-md text-xs text-muted">
          Finrota portal yapısındaki bu ekran, mevcut Akort iyileştirmeleriyle sıradaki fazda doldurulacak. Menü ve
          yönlendirme yapısı hazır.
        </p>
      </Card>

      {prod && (
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{prod.name} · bu üründeki hazır ekranlar</p>
          <div className="flex flex-wrap gap-2">
            {prod.menu.flatMap((m) => (m.children ? m.children : [m])).filter((n) => n.comp && n.path).map((n) => (
              <a key={n.path} href={n.path} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-900 hover:bg-cream-100">
                {n.label} ✓
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
    const start3 = Math.min(Math.max(1, page - 1), Math.max(1, totalPages - 2));
    return start3 + i;
  }).filter((n) => n <= totalPages);

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted">
        {start}-{end} / {total.toLocaleString("tr-TR")} kayıt
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm disabled:opacity-40"
        >
          ←
        </button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${
              n === page ? "bg-brand-600 text-white" : "border border-line text-ink-900 hover:bg-cream-100"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}

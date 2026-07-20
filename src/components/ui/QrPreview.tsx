/**
 * Deterministic, decorative QR-style matrix for the demo.
 * A real deployment would render an actual QR (encoding the payment URL) here;
 * this produces a stable, scannable-looking pattern from the same string so the
 * preview is consistent without pulling in an encoder dependency.
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SIZE = 25; // modules per side (incl. quiet-zone-free finder layout)

function isFinderZone(r: number, c: number): boolean {
  const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
  return inBox(0, 0) || inBox(0, SIZE - 7) || inBox(SIZE - 7, 0);
}

export function QrPreview({ value, className = "" }: { value: string; className?: string }) {
  let seed = hashString(value || "akort");
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const modules: boolean[][] = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => (isFinderZone(r, c) ? false : next() > 0.52)),
  );

  const cell = 100 / SIZE;

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ödeme QR kodu">
      <rect width="100" height="100" fill="#ffffff" />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#14372c" /> : null,
        ),
      )}
      {[
        [0, 0],
        [0, SIZE - 7],
        [SIZE - 7, 0],
      ].map(([br, bc], i) => (
        <g key={i}>
          <rect x={bc * cell} y={br * cell} width={cell * 7} height={cell * 7} fill="#14372c" />
          <rect x={(bc + 1) * cell} y={(br + 1) * cell} width={cell * 5} height={cell * 5} fill="#ffffff" />
          <rect x={(bc + 2) * cell} y={(br + 2) * cell} width={cell * 3} height={cell * 3} fill="#14372c" />
        </g>
      ))}
    </svg>
  );
}

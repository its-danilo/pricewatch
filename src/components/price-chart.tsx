import type { PricePoint } from "@/lib/types";

const W = 600;
const H = 72;

/** Small line chart of a monitor's recorded prices (oldest to newest). */
export function PriceChart({
  points,
  currency,
}: {
  points: PricePoint[];
  currency: string;
}) {
  const priced = points
    .filter((p) => p.price != null)
    .map((p) => ({ price: Number(p.price), at: new Date(p.checked_at) }));

  if (priced.length < 2) {
    return (
      <p className="mt-4 text-xs text-slate-400">
        The price history chart appears after a few checks.
      </p>
    );
  }

  const prices = priced.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) => (i / (priced.length - 1)) * W;
  const y = (v: number) => H - 6 - ((v - min) / span) * (H - 12);
  const line = priced.map((p, i) => `${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const fmt = (v: number) => `${currency} ${v.toFixed(2)}`;
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
        role="img"
        aria-label={`Price history: lowest ${fmt(min)}, highest ${fmt(max)}`}
      >
        <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-emerald-50" />
        <polyline
          points={line}
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="stroke-emerald-600"
          strokeWidth={2}
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{day(priced[0].at)}</span>
        <span>
          Low {fmt(min)} · High {fmt(max)}
        </span>
        <span>{day(priced[priced.length - 1].at)}</span>
      </figcaption>
    </figure>
  );
}

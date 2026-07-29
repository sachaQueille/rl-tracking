const SIZE = 148;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between two adjacent segments, in px along the arc. */
const SEGMENT_GAP = 3;

export type ChartSlice = {
  label: string;
  /** Raw count, shown in the legend next to the share. */
  count: number;
  /** Share of the whole, in percent. Slices are expected to sum to 100. */
  rate: number;
  /** Tailwind text-color class — the mark reads it through `currentColor`. */
  color: string;
};

function DonutSegment({
  startRate,
  rate,
  gap,
  className,
  title,
}: {
  startRate: number;
  rate: number;
  gap: number;
  className: string;
  title: string;
}) {
  const length = (CIRCUMFERENCE * rate) / 100;

  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={RADIUS}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeDasharray={`${Math.max(length - gap, 0.5)} ${CIRCUMFERENCE}`}
      transform={`rotate(${-90 + (360 * startRate) / 100} ${CENTER} ${CENTER})`}
      className={className}
    >
      <title>{title}</title>
    </circle>
  );
}

export function ChartLegend({ slices }: { slices: ChartSlice[] }) {
  return (
    <ul className="flex w-full flex-col gap-1.5">
      {slices.map((slice) => (
        <li key={slice.label} className="flex items-center gap-2 text-sm">
          <span
            className={`h-3 w-3 shrink-0 rounded-sm bg-current ${slice.color}`}
            aria-hidden
          />
          <span className="font-bold">{slice.label}</span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {slice.count} · {slice.rate.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DonutChart({
  slices,
  centerValue,
  centerLabel,
  ariaLabel,
}: {
  slices: ChartSlice[];
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}) {
  const drawn = slices.filter((slice) => slice.rate > 0);
  const gap = drawn.length > 1 ? SEGMENT_GAP : 0;

  // Each arc starts where the previous ones left off.
  const arcs = drawn.map((slice, index) => ({
    ...slice,
    startRate: drawn
      .slice(0, index)
      .reduce((sum, previous) => sum + previous.rate, 0),
  }));

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} role="img" aria-label={ariaLabel}>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted"
        />
        {arcs.map((arc) => (
          <DonutSegment
            key={arc.label}
            startRate={arc.startRate}
            rate={arc.rate}
            gap={gap}
            className={arc.color}
            title={`${arc.label}: ${arc.count} (${arc.rate.toFixed(1)}%)`}
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{centerValue}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

import {
  getCategoryStats,
  getWinRateStats,
  type MatchCategory,
} from "@/shared/actions/matches";
import DonutChart, {
  ChartLegend,
  type ChartSlice,
} from "@/features/matchmaking/components/donut-chart";

/** Color follows the entity, so a category keeps its hue across every card. */
const CATEGORY_COLORS: Record<MatchCategory, string> = {
  smurf: "text-blue-600 dark:text-blue-500",
  unfair: "text-yellow-600 dark:text-amber-600",
  balanced: "text-teal-600",
};

function StatCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-64 flex-col gap-3 rounded-xl border p-4">
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function WinRateBars({
  bars,
}: {
  bars: {
    label: string;
    rate: number;
    wins: number;
    games: number;
    color: string;
  }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {bars.map((bar) => (
        <li key={bar.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold">{bar.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {bar.games > 0 ? (
                <>
                  {bar.rate.toFixed(1)}%{" "}
                  <span className="text-xs">
                    ({bar.wins}/{bar.games})
                  </span>
                </>
              ) : (
                <span className="text-xs">no game</span>
              )}
            </span>
          </div>
          {/* Fixed 0–100% track, so the three bars are directly comparable. */}
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={`h-2 rounded-full bg-current ${bar.color}`}
              style={{ width: `${bar.rate}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function GlobalStats() {
  const [stats, breakdown] = await Promise.all([
    getWinRateStats(),
    getCategoryStats(),
  ]);

  const hasGames = stats.totalGames > 0;

  const resultSlices: ChartSlice[] = [
    {
      label: "Wins",
      count: stats.wins,
      rate: stats.winRate,
      color: "text-emerald-600",
    },
    {
      label: "Losses",
      count: stats.losses,
      rate: stats.lossRate,
      color: "text-red-600 dark:text-red-500",
    },
  ];

  const categorySlices: ChartSlice[] = breakdown.categories.map((category) => ({
    label: category.label,
    count: category.games,
    rate: category.gameRate,
    color: CATEGORY_COLORS[category.category],
  }));

  return (
    <div className="grid w-full gap-4 lg:grid-cols-3">
      <StatCard title="Win rate" hint={`${stats.totalGames} games recorded`}>
        <DonutChart
          slices={resultSlices}
          centerValue={hasGames ? `${Math.round(stats.winRate)}%` : "–"}
          centerLabel="Win rate"
          ariaLabel={
            hasGames
              ? `Win rate ${stats.winRate.toFixed(1)}% over ${stats.totalGames} games`
              : "No game recorded yet"
          }
        />
        <ChartLegend slices={resultSlices} />
      </StatCard>

      <StatCard title="Games by type" hint="Smurf takes priority over unfair">
        <DonutChart
          slices={categorySlices}
          centerValue={`${breakdown.totalGames}`}
          centerLabel="Games"
          ariaLabel={
            hasGames
              ? `Game split: ${categorySlices
                  .map((slice) => `${slice.label} ${slice.rate.toFixed(1)}%`)
                  .join(", ")}`
              : "No game recorded yet"
          }
        />
        <ChartLegend slices={categorySlices} />
      </StatCard>

      <StatCard
        title="Win rate by type"
        hint="Wins within each type · scale 0–100%"
      >
        <WinRateBars
          bars={breakdown.categories.map((category) => ({
            label: category.label,
            rate: category.winRate,
            wins: category.wins,
            games: category.games,
            color: CATEGORY_COLORS[category.category],
          }))}
        />
      </StatCard>
    </div>
  );
}

export default GlobalStats;

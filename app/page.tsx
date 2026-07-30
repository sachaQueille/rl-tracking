import {
  createMatch,
  getMatchCount,
  getMatches,
  type Match,
  type MatchFilter,
} from "@/shared/actions/matches";
import { Badge } from "@/components/ui/badge";
import MatchmakingForm from "@/features/matchmaking/components/matchmaking-form";
import { getRankFromMMR } from "@/shared/utils/utils";
import Image from "next/image";
import GlobalStats from "@/features/matchmaking/components/global-stats";
import TodayFilter from "@/features/matchmaking/components/today-filter";

const RESULT_STYLES = {
  win: {
    label: "Win",
    row: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    badge:
      "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
    score: "text-emerald-700 dark:text-emerald-400",
  },
  loss: {
    label: "Loss",
    row: "border-l-red-500 bg-red-50 dark:bg-red-950/40",
    badge: "bg-red-600 text-white dark:bg-red-500 dark:text-red-950",
    score: "text-red-700 dark:text-red-400",
  },
} as const;

function RankIcon({ mmr }: { mmr: number }) {
  const rank = getRankFromMMR(mmr);

  if (!rank) return null;

  return (
    <Image
      src={`/assets/${rank.name}.webp`}
      alt={rank.rank}
      width={16}
      height={16}
      className="h-10 w-10 shrink-0"
    />
  );
}

function TeamLabel({ label }: { label: string }) {
  return (
    <span className="text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function TeamElos({ elos }: { elos: [number, number] }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {elos.map((elo, index) => (
        <span key={index} className="flex items-center gap-1">
          <span className="w-[3ch] text-right font-semibold tabular-nums">
            {elo}
          </span>
          <RankIcon mmr={elo} />
        </span>
      ))}
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const style = RESULT_STYLES[match.result];

  return (
    <li
      className={`grid grid-cols-[7rem_1fr_5rem] items-center gap-4 rounded-xl border border-l-4 px-4 py-3 ${style.row}`}
    >
      <div className="flex flex-col items-start gap-2">
        <Badge className={`shrink-0 ${style.badge}`}>{style.label}</Badge>
        {match.isUnfairGame && (
          <Badge className="shrink-0 bg-yellow-600 text-white dark:bg-yellow-500 dark:text-yellow-950">
            Unfair game
          </Badge>
        )}
        {match.isSmurfGame && (
          <Badge className="shrink-0 bg-blue-600 text-white dark:bg-blue-500 dark:text-blue-950">
            Smurf game
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 sm:gap-x-8">
        <TeamLabel label="Our team" />
        <span />
        <TeamLabel label="Opponent team" />

        <TeamElos elos={[match.eloSacha, match.eloMathieu]} />
        <span
          className={`flex items-center justify-center text-lg font-bold tabular-nums ${style.score}`}
        >
          {match.teamGoals}
          <span className="mx-1.5 font-normal text-muted-foreground">–</span>
          {match.opponentGoals}
        </span>
        <TeamElos elos={[match.eloOpponent1, match.eloOpponent2]} />
      </div>

      <time
        dateTime={match.createdAt.toISOString()}
        className="text-right text-xs tabular-nums text-muted-foreground"
      >
        {match.createdAt.toLocaleDateString("fr-FR")}
      </time>
    </li>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { since } = await searchParams;

  // The query string is user input like any other — an unparseable `since`
  // degrades to "no filter" rather than throwing.
  const parsed = typeof since === "string" ? new Date(since) : undefined;
  const filter: MatchFilter =
    parsed && !Number.isNaN(parsed.getTime()) ? { since: parsed } : {};
  const todayOnly = filter.since !== undefined;

  const [matches, total] = await Promise.all([
    getMatches(filter),
    // Same filter on both, otherwise the counter contradicts the list.
    getMatchCount(filter),
  ]);

  return (
    <div className="h-screen w-full p-2">
      <div className="h-full flex flex-col p-8 w-full">
        <div className="flex w-full gap-10 items-center">
          <div className="flex flex-col gap-2 min-w-100 h-full">
            <h2 className="mb-2 font-bold text-2xl">Add new game</h2>
            <MatchmakingForm createMatch={createMatch} />
          </div>

          <div className="flex flex-col gap-2 w-full h-full">
            <div className="flex justify-between items-center">
              <h2 className="mb-2 font-bold text-2xl">Games</h2>
              {/* Counter first: its width changes with the filter, so keeping
                  the switch last pins it to the right edge instead of letting
                  it slide on every toggle. */}
              <div className="mb-2 flex items-center gap-6">
                <p className="font-bold tabular-nums text-muted-foreground">
                  {total} games {todayOnly ? "today" : "recorded"}
                </p>
                <TodayFilter enabled={todayOnly} />
              </div>
            </div>
            {/* Fixed height, not max-height: the parent row is items-center, so
                a list that shrinks with the filter would re-center and drag the
                header — and the switch — up and down. */}
            <div className="h-105 overflow-y-auto mb-8">
              {matches.length === 0 ? (
                <p className="text-muted-foreground">
                  {todayOnly ? "No match today." : "No match yet."}
                </p>
              ) : (
                <ul className="flex w-full flex-col gap-2">
                  {matches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full h-full">
          <h2 className="mb-2 font-bold text-2xl">
            {todayOnly ? "Today's stats" : "Global stats"}
          </h2>
          <GlobalStats filter={filter} />
        </div>
      </div>
    </div>
  );
}

import { connection } from "next/server";
import { refresh } from "next/cache";
import type { Filter } from "mongodb";
import { getDb } from "@/shared/db";
import {
  GOAL_DIFFS,
  MATCH_CATEGORIES,
  MATCH_RESULTS,
  type GoalDiff,
  type MatchCategory,
  type MatchResult,
} from "@/shared/constants/matches";

const COLLECTION = "matches";

// si un des 2 > 120, alors c'est déséquilibré
// si les 2 sont > 80 alors c'est déséquilibré

//  % game smurf / % game  unfair / % game balanced
// % winrate avec camembert
// % wr games unfair / % wr games smurf / % wr games balanced
// série win streak / lose streak
// détail par journées / sessions matin, midi, aprem

// Re-exported so server-side callers keep a single import for "matches".
export {
  MATCH_RESULTS,
  MATCH_CATEGORIES,
  GOAL_DIFFS,
  type MatchResult,
  type MatchCategory,
  type GoalDiff,
};

type MatchDocument = {
  eloOpponent1: number;
  eloOpponent2: number;
  eloSacha: number;
  eloMathieu: number;
  result: MatchResult;
  teamGoals: number;
  opponentGoals: number;
  isSmurfGame?: boolean;
  isUnfairGame?: boolean;
  createdAt: Date;
};

export type Match = MatchDocument & { id: string };

const ELO_FIELDS = [
  "eloOpponent1",
  "eloOpponent2",
  "eloSacha",
  "eloMathieu",
] as const satisfies ReadonlyArray<keyof MatchDocument>;

const getCollection = async () => {
  const db = await getDb();
  return db.collection<MatchDocument>(COLLECTION);
};

const parsePositiveInt = (formData: FormData, field: string): number => {
  const value = Number(formData.get(field));

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a positive integer`);
  }

  return value;
};

export const createMatch = async (formData: FormData) => {
  "use server";

  // Server Actions are reachable by direct POST, so never trust the payload.
  const elos = Object.fromEntries(
    ELO_FIELDS.map((field) => [field, parsePositiveInt(formData, field)]),
  ) as Record<(typeof ELO_FIELDS)[number], number>;

  const teamGoals = parsePositiveInt(formData, "teamGoals");
  const opponentGoals = parsePositiveInt(formData, "opponentGoals");
  const isSmurfGame = formData.get("isSmurfGame") === "on" ? true : false;

  const isUnfairGame =
    Math.max(elos.eloOpponent1, elos.eloOpponent2) -
      Math.min(elos.eloSacha, elos.eloMathieu) >=
      120 ||
    (elos.eloOpponent1 - Math.min(elos.eloSacha, elos.eloMathieu) >= 80 &&
      elos.eloOpponent2 - Math.min(elos.eloSacha, elos.eloMathieu) >= 80);

  const matches = await getCollection();
  await matches.insertOne({
    ...elos,
    teamGoals,
    opponentGoals,
    result: opponentGoals > teamGoals ? "loss" : "win",
    isUnfairGame,
    isSmurfGame,
    createdAt: new Date(),
  });

  refresh();
};

/**
 * `since` is an absolute instant, not a calendar day: the browser computes its
 * own midnight and hands it over, so the boundary is right whatever the
 * timezone the server runs in.
 */
export type MatchFilter = {
  since?: Date;
  result?: MatchResult;
  category?: MatchCategory;
  goalDiff?: GoalDiff;
};

/**
 * Same bucketing as `getCategoryStats`: a game that is both smurf and unfair
 * counts as smurf only, so filtering by one category never shows a game the
 * stats attribute to another.
 */
const CATEGORY_QUERIES: Record<MatchCategory, Filter<MatchDocument>> = {
  smurf: { isSmurfGame: true },
  unfair: { isSmurfGame: { $ne: true }, isUnfairGame: true },
  balanced: { isSmurfGame: { $ne: true }, isUnfairGame: { $ne: true } },
};

/** The margin isn't a stored field, so it is recomputed per document. */
const goalDiffQuery = (goalDiff: GoalDiff): Filter<MatchDocument> => {
  const margin = { $abs: { $subtract: ["$teamGoals", "$opponentGoals"] } };
  const value = Number.parseInt(goalDiff, 10);

  return {
    $expr: goalDiff.endsWith("+")
      ? { $gte: [margin, value] }
      : { $eq: [margin, value] },
  };
};

const buildQuery = ({
  since,
  result,
  category,
  goalDiff,
}: MatchFilter = {}): Filter<MatchDocument> => ({
  ...(since ? { createdAt: { $gte: since } } : {}),
  ...(result ? { result } : {}),
  ...(category ? CATEGORY_QUERIES[category] : {}),
  ...(goalDiff ? goalDiffQuery(goalDiff) : {}),
});

type SearchParamValue = string | string[] | undefined;

const isOption = <T extends string>(
  options: ReadonlyArray<{ value: T }>,
  value: SearchParamValue,
): value is T => options.some((option) => option.value === value);

/**
 * The query string is user input like any other: anything unparseable degrades
 * to "no filter" rather than throwing or reaching Mongo.
 */
export const parseMatchFilter = (
  searchParams: Record<string, SearchParamValue>,
): MatchFilter => {
  const { since, result, category, diff } = searchParams;
  const parsed = typeof since === "string" ? new Date(since) : undefined;

  return {
    ...(parsed && !Number.isNaN(parsed.getTime()) ? { since: parsed } : {}),
    ...(isOption(MATCH_RESULTS, result) ? { result } : {}),
    ...(isOption(MATCH_CATEGORIES, category) ? { category } : {}),
    ...(isOption(GOAL_DIFFS, diff) ? { goalDiff: diff } : {}),
  };
};

export const getMatches = async (
  filter: MatchFilter = {},
  limit = 50,
): Promise<Match[]> => {
  // Read at request time so the match list is never baked into the build.
  await connection();

  const matches = await getCollection();
  const docs = await matches
    .find(buildQuery(filter))
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  // ObjectId is not serializable across the RSC boundary — hand back a string.
  return docs.map(({ _id, ...doc }) => ({ ...doc, id: _id.toString() }));
};

export const getMatchCount = async (filter: MatchFilter = {}): Promise<number> => {
  await connection();

  const matches = await getCollection();
  return matches.countDocuments(buildQuery(filter));
};

export const getWinRateStats = async (
  filter: MatchFilter = {},
): Promise<{
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
}> => {
  await connection();

  const matches = await getCollection();
  const query = buildQuery(filter);
  const totalGames = await matches.countDocuments(query);
  const wins = await matches.countDocuments({ ...query, result: "win" });
  const losses = await matches.countDocuments({ ...query, result: "loss" });

  return {
    totalGames,
    wins,
    losses,
    winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    lossRate: totalGames > 0 ? (losses / totalGames) * 100 : 0,
  };
};

export type CategoryStat = {
  category: MatchCategory;
  label: string;
  games: number;
  wins: number;
  losses: number;
  /** Share of all games that fall in this category. */
  gameRate: number;
  /** Win rate *within* this category — these do not sum to 100. */
  winRate: number;
  /** Share of all *losses* that fall in this category — these sum to 100. */
  lossShare: number;
};

export const getCategoryStats = async (
  filter: MatchFilter = {},
): Promise<{
  totalGames: number;
  totalLosses: number;
  categories: CategoryStat[];
}> => {
  await connection();

  const matches = await getCollection();
  const query = buildQuery(filter);
  const rows = await matches
    .aggregate<{
      _id: MatchCategory;
      games: number;
      wins: number;
      losses: number;
    }>([
      // Skipped entirely when unfiltered — an empty $match is a wasted stage.
      ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
      {
        $group: {
          // A game can be both smurf and unfair. Smurf takes priority so the
          // buckets stay mutually exclusive and their shares sum to 100%.
          _id: {
            $cond: [
              { $eq: ["$isSmurfGame", true] },
              "smurf",
              {
                $cond: [{ $eq: ["$isUnfairGame", true] }, "unfair", "balanced"],
              },
            ],
          },
          games: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ["$result", "loss"] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  const byCategory = new Map(rows.map((row) => [row._id, row]));
  const totalGames = rows.reduce((sum, row) => sum + row.games, 0);
  const totalLosses = rows.reduce((sum, row) => sum + row.losses, 0);

  return {
    totalGames,
    totalLosses,
    // Walk MATCH_CATEGORIES so empty categories still get a (zeroed) entry and
    // the order — hence the colors — never depends on the aggregation output.
    categories: MATCH_CATEGORIES.map(({ value, label }) => {
      const games = byCategory.get(value)?.games ?? 0;
      const wins = byCategory.get(value)?.wins ?? 0;
      const losses = byCategory.get(value)?.losses ?? 0;

      return {
        category: value,
        label,
        games,
        wins,
        losses,
        gameRate: totalGames > 0 ? (games / totalGames) * 100 : 0,
        winRate: games > 0 ? (wins / games) * 100 : 0,
        lossShare: totalLosses > 0 ? (losses / totalLosses) * 100 : 0,
      };
    }),
  };
};

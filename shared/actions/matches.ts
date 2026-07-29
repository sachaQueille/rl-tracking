import { connection } from "next/server";
import { refresh } from "next/cache";
import { getDb } from "@/shared/db";

const COLLECTION = "matches";

export const MATCH_RESULTS = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
] as const;

// si un des 2 > 120, alors c'est déséquilibré
// si les 2 sont > 80 alors c'est déséquilibré

//  % game smurf / % game  unfair / % game balanced
// % winrate avec camembert
// % wr games unfair / % wr games smurf / % wr games balanced
// série win streak / lose streak
// détail par journées / sessions matin, midi, aprem

export type MatchResult = (typeof MATCH_RESULTS)[number]["value"];

export const MATCH_CATEGORIES = [
  { value: "smurf", label: "Smurf" },
  { value: "unfair", label: "Unfair" },
  { value: "balanced", label: "Balanced" },
] as const;

export type MatchCategory = (typeof MATCH_CATEGORIES)[number]["value"];

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

export const getMatches = async (limit = 50): Promise<Match[]> => {
  // Read at request time so the match list is never baked into the build.
  await connection();

  const matches = await getCollection();
  const docs = await matches
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  // ObjectId is not serializable across the RSC boundary — hand back a string.
  return docs.map(({ _id, ...doc }) => ({ ...doc, id: _id.toString() }));
};

export const getMatchCount = async (): Promise<number> => {
  await connection();

  const matches = await getCollection();
  return matches.countDocuments();
};

export const getWinRateStats = async (): Promise<{
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
}> => {
  await connection();

  const matches = await getCollection();
  const totalGames = await matches.countDocuments();
  const wins = await matches.countDocuments({ result: "win" });
  const losses = await matches.countDocuments({ result: "loss" });

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
  /** Share of all games that fall in this category. */
  gameRate: number;
  /** Win rate *within* this category — these do not sum to 100. */
  winRate: number;
};

export const getCategoryStats = async (): Promise<{
  totalGames: number;
  categories: CategoryStat[];
}> => {
  await connection();

  const matches = await getCollection();
  const rows = await matches
    .aggregate<{ _id: MatchCategory; games: number; wins: number }>([
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
        },
      },
    ])
    .toArray();

  const byCategory = new Map(rows.map((row) => [row._id, row]));
  const totalGames = rows.reduce((sum, row) => sum + row.games, 0);

  return {
    totalGames,
    // Walk MATCH_CATEGORIES so empty categories still get a (zeroed) entry and
    // the order — hence the colors — never depends on the aggregation output.
    categories: MATCH_CATEGORIES.map(({ value, label }) => {
      const games = byCategory.get(value)?.games ?? 0;
      const wins = byCategory.get(value)?.wins ?? 0;

      return {
        category: value,
        label,
        games,
        wins,
        gameRate: totalGames > 0 ? (games / totalGames) * 100 : 0,
        winRate: games > 0 ? (wins / games) * 100 : 0,
      };
    }),
  };
};

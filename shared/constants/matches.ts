/**
 * The vocabulary of a match — kept apart from `shared/actions/matches`, which
 * reaches for the Mongo driver: a Client Component that only needs the option
 * lists must not drag the driver into the browser bundle.
 */

export const MATCH_RESULTS = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
] as const;

export type MatchResult = (typeof MATCH_RESULTS)[number]["value"];

export const MATCH_CATEGORIES = [
  { value: "smurf", label: "Smurf" },
  { value: "unfair", label: "Unfair" },
  { value: "balanced", label: "Balanced" },
] as const;

export type MatchCategory = (typeof MATCH_CATEGORIES)[number]["value"];

/**
 * The margin is never stored, only derived — so the buckets live here, next to
 * the other match vocabulary, and are recomputed at query time. The last one is
 * open-ended: past a few goals the exact score stops mattering.
 */
export const GOAL_DIFFS = [
  { value: "1", label: "1 goal" },
  { value: "2", label: "2 goals" },
  { value: "3", label: "3 goals" },
  { value: "4", label: "4 goals" },
  { value: "5+", label: "5 goals or more" },
] as const;

export type GoalDiff = (typeof GOAL_DIFFS)[number]["value"];

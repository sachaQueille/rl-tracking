"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  GOAL_DIFFS,
  MATCH_CATEGORIES,
  MATCH_RESULTS,
} from "@/shared/constants/matches";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildFilterHref } from "@/shared/utils/search-params";

/** Stands in for "no filter": a select always has a value, the URL doesn't. */
const ANY = "any";

type FilterOption = { value: string; label: string };

const FILTERS: {
  param: string;
  label: string;
  /** Label of the `ANY` entry — worded per filter, `All` reads as a category. */
  anyLabel: string;
  options: readonly FilterOption[];
}[] = [
  {
    param: "diff",
    label: "Goal difference",
    anyLabel: "Any difference",
    options: GOAL_DIFFS,
  },
  {
    param: "result",
    label: "Result",
    anyLabel: "Wins & losses",
    options: MATCH_RESULTS,
  },
  {
    param: "category",
    label: "Game type",
    anyLabel: "Every game type",
    options: MATCH_CATEGORIES,
  },
];

/**
 * Writes the filters into the URL rather than local state, like
 * `TodayFilter`: the list is rendered on the server, so only a navigation
 * makes it query Mongo again.
 */
const MatchFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = (updates: Record<string, string | null>) => {
    startTransition(() => {
      router.push(buildFilterHref(searchParams, updates), { scroll: false });
    });
  };

  const isFiltered = FILTERS.some(({ param }) => searchParams.has(param));

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      {FILTERS.map(({ param, label, anyLabel, options }) => {
        // `items` is what makes the trigger show the label instead of the raw
        // value, so the "any" entry has to be part of it, not just of the list.
        const items = [{ value: ANY, label: anyLabel }, ...options];

        return (
          <div key={param} className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <Select
              items={items}
              value={searchParams.get(param) ?? ANY}
              // `null` never happens here — the select isn't clearable — but
              // it maps to "no filter" anyway, same as the `ANY` entry.
              onValueChange={(value: string | null) =>
                navigate({ [param]: value === ANY ? null : value })
              }
              disabled={isPending}
            >
              <SelectTrigger size="sm" aria-label={label} className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          // Clears the game filters only: `since` belongs to the switch above,
          // which would otherwise flip back on its own.
          onClick={() =>
            navigate(
              Object.fromEntries(FILTERS.map(({ param }) => [param, null])),
            )
          }
        >
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default MatchFilters;

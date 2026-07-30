"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { buildFilterHref } from "@/shared/utils/search-params";

/**
 * Writes the filter into the URL rather than local state: the match list is
 * rendered on the server, so only a navigation makes it query Mongo again.
 */
const TodayFilter = ({ enabled }: { enabled: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const toggle = (checked: boolean) => {
    // Midnight is resolved here, in the browser, so the cutoff matches the day
    // the players actually see. The server just trusts the instant it gets.
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    startTransition(() => {
      // Only `since` changes — the game filters ride along untouched.
      router.push(
        buildFilterHref(searchParams, {
          since: checked ? midnight.toISOString() : null,
        }),
        { scroll: false },
      );
    });
  };

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Switch checked={enabled} onCheckedChange={toggle} disabled={isPending} />
      Today only
    </label>
  );
};

export default TodayFilter;

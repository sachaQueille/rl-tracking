import { connection } from "next/server";

const TRACKER_API_BASE = "https://public-api.tracker.gg/v2";

type GetStatsParams = {
  titleSlug?: string;
  platformSlug?: string;
  platformUserIdentifier?: string;
};

export const getStats = async ({
  titleSlug = "rocket-league",
  platformSlug = "epic",
  platformUserIdentifier = "mamen953",
}: GetStatsParams = {}) => {
  // Read the key at request time so it is never baked into the build output.
  await connection();

  const apiKey = process.env.TRACKER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing TRACKER_API_KEY env variable");
  }

  const url = `${TRACKER_API_BASE}/${titleSlug}/standard/profile/${platformSlug}/${encodeURIComponent(
    platformUserIdentifier,
  )}`;

  const res = await fetch(url, {
    headers: {
      "TRN-Api-Key": apiKey,
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    const body = await res.text();

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Tracker Network rejected the API key (${res.status}) — ${body}. ` +
          `Verify TRACKER_API_KEY against your app at https://tracker.gg/developers: ` +
          `the app must exist and be approved for API access.`,
      );
    }

    throw new Error(
      `Failed to fetch stats: ${res.status} ${res.statusText} — ${body}`,
    );
  }

  // The Tracker API wraps its payload in a `data` envelope.
  const { data } = await res.json();
  return data;
};

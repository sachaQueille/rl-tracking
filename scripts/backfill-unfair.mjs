// Recompute isUnfairGame from the elos on every stored match.
//
//   node scripts/backfill-unfair.mjs           # dry run, prints what would change
//   node scripts/backfill-unfair.mjs --apply   # writes
//
// Re-run this whenever the fairness thresholds in createMatch() change.
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index).trim(),
        line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

// Mirrors createMatch() in shared/actions/matches.ts.
const isUnfair = (doc) => {
  const minUs = Math.min(doc.eloSacha, doc.eloMathieu);

  return (
    Math.max(doc.eloOpponent1, doc.eloOpponent2) - minUs >= 120 ||
    (doc.eloOpponent1 - minUs >= 80 && doc.eloOpponent2 - minUs >= 80)
  );
};

const client = new MongoClient(env.MONGODB_URI);
await client.connect();

try {
  const matches = client
    .db(env.MONGODB_DB ?? "rocket_stats")
    .collection("matches");

  const docs = await matches.find().sort({ createdAt: 1 }).toArray();
  const changes = docs
    .map((doc) => ({ doc, expected: isUnfair(doc) }))
    .filter(({ doc, expected }) => doc.isUnfairGame !== expected);

  console.log(`${docs.length} matches scanned, ${changes.length} to update\n`);

  for (const { doc, expected } of changes) {
    const minUs = Math.min(doc.eloSacha, doc.eloMathieu);
    console.log(
      `${doc._id}  us ${doc.eloSacha}/${doc.eloMathieu}` +
        `  opp ${doc.eloOpponent1}/${doc.eloOpponent2}` +
        `  gaps ${doc.eloOpponent1 - minUs}/${doc.eloOpponent2 - minUs}` +
        `  ${String(doc.isUnfairGame)} -> ${expected}`,
    );
  }

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to write.");
  } else {
    for (const { doc, expected } of changes) {
      await matches.updateOne(
        { _id: doc._id },
        { $set: { isUnfairGame: expected } },
      );
    }
    console.log(`\nAPPLIED — ${changes.length} documents updated.`);
  }
} finally {
  await client.close();
}

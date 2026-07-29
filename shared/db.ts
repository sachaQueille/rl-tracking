import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI env variable");
}

const dbName = process.env.MONGODB_DB ?? "rocket_stats";

// Next.js hot-reloads server modules on every edit in dev, which would open a
// brand new connection pool each time until Mongo refuses them. Stash the
// client on globalThis so reloads reuse the same pool.
const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export const getDb = async (): Promise<Db> => {
  const client = await clientPromise;
  return client.db(dbName);
};

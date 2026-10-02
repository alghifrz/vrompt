import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

let queryClient: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof createDb> | undefined;

function createDb() {
  const client = postgres(getDatabaseUrl(), {
    max: 4,
  });
  queryClient = client;
  return drizzle(client, { schema });
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }

  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;

export async function closeDb(): Promise<void> {
  if (queryClient) {
    await queryClient.end();
    queryClient = undefined;
    dbInstance = undefined;
  }
}

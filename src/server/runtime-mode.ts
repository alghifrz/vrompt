import { PersistenceError, PersistenceErrorCode } from "./persistence/errors";

export type PersistenceMode = "postgres" | "memory";

export function resolvePersistenceMode(env: {
  NODE_ENV?: string;
  DATABASE_URL?: string;
} = process.env): PersistenceMode {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    return "postgres";
  }

  if (env.NODE_ENV === "production") {
    throw new PersistenceError(
      PersistenceErrorCode.DATABASE_ERROR,
      "DATABASE_URL is required in production.",
    );
  }

  return "memory";
}

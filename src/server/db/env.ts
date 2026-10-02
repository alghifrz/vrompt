import "server-only";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) {
    throw new PersistenceError(
      PersistenceErrorCode.DATABASE_ERROR,
      "Database is not configured.",
    );
  }

  return url;
}

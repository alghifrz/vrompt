import "server-only";
import {
  asAuthError,
  createRequireAuth,
  rejectIfAuthUnavailable,
  type AuthIdentity,
} from "./require-auth";

export async function requireAuth(): Promise<AuthIdentity> {
  rejectIfAuthUnavailable(
    Boolean(
      process.env.CLERK_SECRET_KEY &&
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
  );

  try {
    const { auth } = await import("@clerk/nextjs/server");
    return await createRequireAuth(async () => {
      const { userId } = await auth();
      return { userId };
    })();
  } catch (error) {
    throw asAuthError(error);
  }
}

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 may warn that middleware.ts is moving toward proxy.ts.
// Clerk 7 still authenticates through clerkMiddleware. Do not rename this
// file unless the installed Clerk + Next combination documents that move.

const clerkEnabled = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

const isProtected = createRouteMatcher([
  "/start(.*)",
  "/interview(.*)",
  "/review(.*)",
  "/generate(.*)",
  "/api/projects(.*)",
]);

export default clerkEnabled
  ? clerkMiddleware(async (auth, request) => {
      if (isProtected(request)) {
        await auth.protect({
          unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
        });
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

const LIVE_PUBLISHABLE_PREFIX = "pk_live_";

export function shouldProxyClerkFrontendApi() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PROXY_URL ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith(
        LIVE_PUBLISHABLE_PREFIX,
      ),
  );
}

export function resolveClerkProxyUrl(origin?: string) {
  const configured = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith(
      LIVE_PUBLISHABLE_PREFIX,
    ) ||
    !origin
  ) {
    return undefined;
  }

  return `${origin.replace(/\/$/, "")}/__clerk`;
}

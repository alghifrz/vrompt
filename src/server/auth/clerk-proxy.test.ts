import { afterEach, describe, expect, it } from "vitest";
import { resolveClerkProxyUrl, shouldProxyClerkFrontendApi } from "./clerk-proxy";

const originalProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_CLERK_PROXY_URL = originalProxyUrl;
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublishableKey;
});

describe("resolveClerkProxyUrl", () => {
  it("uses the explicit proxy URL", () => {
    process.env.NEXT_PUBLIC_CLERK_PROXY_URL = "https://app.example/__clerk/";

    expect(resolveClerkProxyUrl("http://localhost:3000")).toBe(
      "https://app.example/__clerk",
    );
  });

  it("derives a proxy URL for live keys", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_example";

    expect(resolveClerkProxyUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/__clerk",
    );
  });

  it("does not derive a proxy URL for development keys", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";

    expect(resolveClerkProxyUrl("http://localhost:3000")).toBeUndefined();
  });
});

describe("shouldProxyClerkFrontendApi", () => {
  it("is true for live keys", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_example";

    expect(shouldProxyClerkFrontendApi()).toBe(true);
  });

  it("is false for development keys without an explicit proxy", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";

    expect(shouldProxyClerkFrontendApi()).toBe(false);
  });
});

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { clerkAppearance } from "../components/auth/clerk-appearance";
import { resolveClerkProxyUrl } from "../server/auth/clerk-proxy";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Vrompt",
    template: "%s | Vrompt",
  },
  description:
    "Turn a project idea into a structured specification and AI coding-agent configuration.",
  icons: {
    icon: "/icon.webp",
    apple: "/logo.webp",
  },
};

async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    return undefined;
  }

  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const tree = (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return tree;
  }

  const proxyUrl = resolveClerkProxyUrl(await requestOrigin());

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/start"
      signUpFallbackRedirectUrl="/start"
      afterSignOutUrl="/"
      {...(proxyUrl ? { proxyUrl } : {})}
    >
      {tree}
    </ClerkProvider>
  );
}

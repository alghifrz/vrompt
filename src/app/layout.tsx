import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { clerkAppearance } from "../components/auth/clerk-appearance";
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

export default function RootLayout({
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

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/start"
      signUpFallbackRedirectUrl="/start"
      afterSignOutUrl="/"
    >
      {tree}
    </ClerkProvider>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLandingMotion } from "./motion";
import { ghostButtonClass, limeButtonClass } from "./styles";

const MotionLink = motion.create(Link);

const variants = {
  primary: limeButtonClass,
  ghost: ghostButtonClass,
  nav: `${limeButtonClass} px-4 py-2`,
} as const;

function pressProps(enabled: boolean) {
  return {
    whileHover: enabled ? { scale: 1.04 } : undefined,
    whileTap: enabled ? { scale: 0.97 } : undefined,
    transition: { type: "spring" as const, stiffness: 420, damping: 22 },
  };
}

function MotionCta({
  className,
  children,
  href,
}: {
  className: string;
  children: ReactNode;
  href: string;
}) {
  const enabled = useLandingMotion();

  return (
    <MotionLink href={href} className={className} {...pressProps(enabled)}>
      {children}
    </MotionLink>
  );
}

export function StartButton({
  children = "Start a project",
  variant = "primary",
  className = "",
}: {
  children?: string;
  variant?: keyof typeof variants;
  className?: string;
}) {
  const classNames = `${variants[variant]} ${className}`;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <MotionCta href="/sign-in" className={classNames}>
        {children}
      </MotionCta>
    );
  }

  return <AuthedStartButton className={classNames}>{children}</AuthedStartButton>;
}

function AuthedStartButton({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  const { isSignedIn } = useUser();

  return (
    <MotionCta href={isSignedIn ? "/start" : "/sign-in"} className={className}>
      {children}
    </MotionCta>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export const landingEase = [0.22, 1, 0.36, 1] as const;

export function useLandingMotion() {
  return useReducedMotion() !== true;
}

export function Reveal({
  children,
  className,
  delay = 0,
  x = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
}) {
  const enabled = useLandingMotion();

  return (
    <motion.div
      className={className}
      initial={enabled ? { opacity: 0, x, y } : false}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.65, delay, ease: landingEase }}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const enabled = useLandingMotion();

  return (
    <motion.div
      className={className}
      whileHover={enabled ? { y: -6 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

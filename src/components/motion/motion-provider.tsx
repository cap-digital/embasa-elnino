"use client";

import { MotionConfig } from "motion/react";

/** Respeita prefers-reduced-motion em todas as animações do motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

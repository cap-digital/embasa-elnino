"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  /** Deslocamento vertical inicial em px. */
  y?: number;
}

/** Reveal discreto ao entrar na tela (uma única vez). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  ...props
}: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      viewport={{ once: true, amount: 0.15 }}
      whileInView={{ opacity: 1, y: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

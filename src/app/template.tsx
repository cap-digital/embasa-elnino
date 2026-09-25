"use client";

import { motion } from "motion/react";

/** Transição suave entre páginas: remonta a cada navegação. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

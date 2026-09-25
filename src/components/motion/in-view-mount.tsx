"use client";

import { useInView } from "motion/react";
import { type CSSProperties, useRef } from "react";
import { cn } from "@/lib/utils";

interface InViewMountProps {
  children: React.ReactNode;
  className?: string;
  /** Altura mínima reservada fora do modo `fit:` (nele o conteúdo preenche o card). */
  minHeight?: number;
  margin?: string;
}

/** Só monta (e anima) o conteúdo quando ele fica visível. */
export function InViewMount({
  children,
  className,
  minHeight = 240,
  margin = "0px",
}: InViewMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: margin as never });
  return (
    <div
      className={cn("w-full min-h-(--mh) fit:min-h-0", className)}
      ref={ref}
      style={{ "--mh": `${minHeight}px` } as CSSProperties}
    >
      {inView ? children : null}
    </div>
  );
}

"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  format?: Format;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Atraso em ms depois de entrar na tela. */
  delay?: number;
}

const defaultFormat: Format = { maximumFractionDigits: 0 };

/** Número com contagem animada quando entra na tela (pt-BR, respeita reduced motion). */
export function CountUp({
  value,
  format = defaultFormat,
  prefix,
  suffix,
  className,
  delay = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) {
      return;
    }
    const id = window.setTimeout(() => setShown(value), delay);
    return () => window.clearTimeout(id);
  }, [inView, value, delay]);

  return (
    <span className={cn("inline-block", className)} ref={ref}>
      <NumberFlow
        format={format}
        locales="pt-BR"
        prefix={prefix}
        suffix={suffix}
        transformTiming={{ duration: 900, easing: "cubic-bezier(0.22,1,0.36,1)" }}
        value={shown}
        willChange
      />
    </span>
  );
}

export const currencyFormat: Format = {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
};

export const currencyCentsFormat: Format = {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const percentFormat: Format = {
  style: "percent",
  maximumFractionDigits: 0,
};

export const percentOneDigitFormat: Format = {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

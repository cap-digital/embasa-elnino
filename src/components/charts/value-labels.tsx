"use client";

import { useMemo } from "react";
import { useChartStable, useYScale } from "./chart-context";

/**
 * Rótulos de dados (valor escrito sobre cada ponto/barra) sem sobreposição.
 *
 * - Em linhas/áreas, o rótulo desvia da linha conforme a inclinação.
 * - Largura de cada rótulo estimada pelo nº de caracteres; da direita para a
 *   esquerda (o dia mais recente sempre aparece), um rótulo só entra se não
 *   encosta no anterior. Com muitos pontos, mostra um a cada N.
 * - Rótulo que sairia pelo topo desce para baixo do ponto.
 * - Contorno na cor do card para ler bem sobre linhas, áreas e grade.
 *
 * Usa `valueKey` (e não `dataKey`) para não ser contado como série pelos gráficos.
 */

const CHAR_WIDTH = 6.1;
const PADDING = 6;
const MIN_GAP = 4;
const FONT_SIZE = 10;

interface Candidate {
  x: number;
  y: number;
  text: string;
  width: number;
}

const estimateWidth = (text: string) => text.length * CHAR_WIDTH + PADDING;

/** Mantém só os rótulos que cabem lado a lado, priorizando o fim da série. */
function thinOut(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  let leftEdge = Number.POSITIVE_INFINITY;
  for (let i = candidates.length - 1; i >= 0; i--) {
    const c = candidates[i];
    if (c.x + c.width / 2 + MIN_GAP <= leftEdge) {
      kept.push(c);
      leftEdge = c.x - c.width / 2;
    }
  }
  return kept;
}

function LabelText({ c, color, anchor = "middle" }: { c: Candidate; color: string; anchor?: "start" | "middle" }) {
  return (
    <text
      dominantBaseline="central"
      fill={color}
      fontSize={FONT_SIZE}
      fontWeight={600}
      paintOrder="stroke"
      stroke="var(--card)"
      strokeLinejoin="round"
      strokeWidth={3}
      style={{ fontVariantNumeric: "tabular-nums" }}
      textAnchor={anchor}
      x={c.x}
      y={c.y}
    >
      {c.text}
    </text>
  );
}

function useFadeIn() {
  const { isLoaded, animationDuration } = useChartStable();
  return {
    opacity: isLoaded ? 1 : 0,
    transition: `opacity 400ms ease ${isLoaded ? (animationDuration || 1100) : 0}ms`,
  };
}

export interface ValueLabelsProps {
  valueKey: string;
  format: (value: number) => string;
  yAxisId?: string;
  color?: string;
  /** Distância em px entre o ponto e o rótulo. Default: 9 */
  offset?: number;
  /** Omite rótulos de valor zero. Default: true */
  hideZero?: boolean;
  /**
   * `"point"` (linha/área): rótulo desviando da linha conforme a inclinação.
   * `"bar"` (colunas): sempre centrado acima da coluna. Default: "point"
   */
  mode?: "point" | "bar";
}

/** Rótulos para séries temporais (ComposedChart: Area, Line, SeriesBar). */
export function ValueLabels({
  valueKey,
  format,
  yAxisId,
  color = "var(--foreground)",
  offset = 9,
  hideZero = true,
  mode = "point",
}: ValueLabelsProps) {
  const { data, xScale, xAccessor, innerWidth, margin } = useChartStable();
  const yScale = useYScale(yAxisId);
  const style = useFadeIn();

  const labels = useMemo(() => {
    // Dentro da área de plotagem: não invade os rótulos dos eixos Y.
    const minX = 0;
    const maxX = innerWidth + Math.min(margin.right, 8);
    const topLimit = -margin.top + 2;
    const points: Array<{ px: number; py: number; text: string; width: number }> = [];
    for (const d of data) {
      const value = d[valueKey];
      if (typeof value !== "number") {
        continue;
      }
      const text = hideZero && value === 0 ? "" : format(value);
      points.push({ px: xScale(xAccessor(d)) ?? 0, py: yScale(value) ?? 0, text, width: estimateWidth(text) });
    }

    const candidates: Candidate[] = [];
    points.forEach((p, i) => {
      if (!p.text) {
        return;
      }
      let dx = 0;
      let below = false;
      if (mode === "point") {
        // Em px, y menor = mais alto. O rótulo vai para o lado por onde a linha
        // não passa: subindo → acima-esquerda; descendo → acima-direita;
        // vale → abaixo; pontas → para dentro do gráfico.
        const prevHigher = i > 0 && points[i - 1].py < p.py - 1;
        const nextHigher = i < points.length - 1 && points[i + 1].py < p.py - 1;
        const half = p.width / 2 + 2;
        if (i === 0 && nextHigher) {
          dx = half;
          below = true;
        } else if (i === points.length - 1 && prevHigher) {
          dx = -half;
          below = true;
        } else if (prevHigher && nextHigher) {
          below = true;
        } else if (nextHigher) {
          dx = -half;
        } else if (prevHigher) {
          dx = half;
        }
      }
      const above = p.py - offset;
      if (!below && above - FONT_SIZE / 2 < topLimit) {
        below = true;
      }
      candidates.push({
        text: p.text,
        width: p.width,
        x: Math.min(Math.max(p.px + dx, minX + p.width / 2), maxX - p.width / 2),
        y: below ? p.py + offset : above,
      });
    });
    return thinOut(candidates);
  }, [data, valueKey, hideZero, format, xScale, xAccessor, yScale, offset, innerWidth, margin, mode]);

  return (
    <g pointerEvents="none" style={style}>
      {labels.map((c) => (
        <LabelText c={c} color={color} key={`${c.x}-${c.text}`} />
      ))}
    </g>
  );
}

(ValueLabels as unknown as Record<string, boolean>).__isPostOverlay = true;

/** Rótulos para gráficos de barras por categoria (BarChart vertical ou horizontal). */
export function BarValueLabels({
  valueKey,
  format,
  color = "var(--foreground)",
  offset = 6,
  hideZero = false,
}: Omit<ValueLabelsProps, "yAxisId" | "mode">) {
  const { data, yScale, barScale, bandWidth, barXAccessor, orientation, innerWidth, margin } =
    useChartStable();
  const style = useFadeIn();
  const horizontal = orientation === "horizontal";

  const labels = useMemo(() => {
    if (!(barScale && bandWidth && barXAccessor)) {
      return [];
    }
    const out: Array<Candidate & { anchor: "start" | "middle" }> = [];
    for (const d of data) {
      const value = d[valueKey];
      if (typeof value !== "number" || (hideZero && value === 0)) {
        continue;
      }
      const text = format(value);
      const width = estimateWidth(text);
      const band = (barScale(barXAccessor(d)) ?? 0) + bandWidth / 2;
      const valuePos = yScale(value) ?? 0;
      if (horizontal) {
        // À direita da barra; se não couber, dentro dela, alinhado ao fim.
        const fits = valuePos + offset + width <= innerWidth + margin.right;
        out.push({ text, width, anchor: "start", y: band, x: fits ? valuePos + offset : valuePos - offset - width });
      } else {
        const above = valuePos - offset;
        out.push({
          text,
          width,
          anchor: "middle",
          x: band,
          y: above - FONT_SIZE / 2 < -margin.top + 2 ? valuePos + offset + FONT_SIZE / 2 : above,
        });
      }
    }
    // Barras verticais estreitas: evita rótulos encostados.
    return horizontal ? out : (thinOut(out) as typeof out);
  }, [data, valueKey, hideZero, format, yScale, barScale, bandWidth, barXAccessor, horizontal, offset, innerWidth, margin]);

  return (
    <g pointerEvents="none" style={style}>
      {labels.map((c) => (
        <LabelText anchor={c.anchor} c={c} color={color} key={`${c.x}-${c.y}-${c.text}`} />
      ))}
    </g>
  );
}

(BarValueLabels as unknown as Record<string, boolean>).__isPostOverlay = true;

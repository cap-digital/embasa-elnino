import type { FunnelStage } from "@/components/charts/funnel-chart";
import type { LineId, LineSummary } from "@/data/types";

/**
 * Cada plataforma tem uma composição própria para as páginas não parecerem
 * iguais. Os layouts pressupõem dados que façam sentido:
 * - heatmap: série diária longa (várias semanas);
 * - funil: etapas reais (áudio, quartis de vídeo, disparos).
 */
export type LineLayout = "classico" | "funil" | "heatmap" | "display" | "shorts" | "instream" | "pesquisa";

export const LINE_LAYOUT: Record<LineId, LineLayout> = {
  "rich-media": "heatmap",
  "rede-display": "display",
  "video-hawk": "classico",
  "rede-pesquisa": "pesquisa",
  "youtube-shorts": "shorts",
  "youtube-instream": "instream",
  "connected-tv": "heatmap",
  spotify: "funil",
  whatsapp: "funil",
};

/** Etapas do funil da linha, a partir das métricas complementares. */
export function funnelStagesFor(summary: LineSummary): { title: string; description: string; stages: FunnelStage[] } | null {
  const c = summary.complementary;
  if (!c) {
    return null;
  }
  switch (c.strategy) {
    case "escutas":
      if (c.funnel.starts <= 0) {
        return null;
      }
      return {
        title: "Funil de escuta do áudio",
        description: "Do início do áudio à escuta completa (período inteiro).",
        stages: [
          { label: "Inícios", value: c.funnel.starts },
          { label: "25% ouvido", value: c.funnel.q25 },
          { label: "50% ouvido", value: c.funnel.q50 },
          { label: "75% ouvido", value: c.funnel.q75 },
          { label: "Escutas completas", value: c.funnel.completes },
        ],
      };
    case "visualizacoes":
      if (c.quartiles.q25 <= 0) {
        return null;
      }
      return {
        title: "Funil de retenção do vídeo",
        description: "Impressões que chegaram a cada quartil do vídeo.",
        stages: [
          { label: "Impressões", value: c.impressions },
          { label: "25% assistido", value: Math.round(c.impressions * c.quartiles.q25) },
          { label: "50% assistido", value: Math.round(c.impressions * c.quartiles.q50) },
          { label: "75% assistido", value: Math.round(c.impressions * c.quartiles.q75) },
          { label: "100% assistido", value: Math.round(c.impressions * c.quartiles.q100) },
        ],
      };
    case "disparos":
      return {
        title: "Funil dos disparos",
        description: "Do envio ao clique na mensagem.",
        stages: [
          { label: "Enviados", value: c.sent },
          { label: "Entregues", value: c.delivered },
          { label: "Lidos", value: Math.round(c.delivered * c.readRate) },
          { label: "Cliques", value: c.clicks },
        ],
      };
    default:
      return null;
  }
}

import type { Format } from "@number-flow/react";
import { CountUp, currencyCentsFormat, percentOneDigitFormat } from "@/components/motion/count-up";
import type { ComplementaryMetrics as Metrics } from "@/data/types";

interface Item {
  label: string;
  value: number;
  format?: Format;
  hint?: string;
}

const decimalOne: Format = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
const percentTwo: Format = { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * `clicksInsteadOfMetric`: troca a métrica contratada (já no KPI do topo da
 * página) por Cliques, para não repetir o número.
 */
export function complementaryItems(m: Metrics, clicksInsteadOfMetric = false): Item[] {
  switch (m.strategy) {
    case "alcance":
      return [
        { label: "Impressões", value: m.impressions },
        // Alcance e frequência só quando a fonte informa (a planilha do Rich Media não traz).
        ...(m.reach > 0
          ? [
              { label: "Alcance", value: m.reach, hint: "pessoas únicas" },
              { label: "Frequência", value: m.frequency, format: decimalOne, hint: "impressões por pessoa" },
            ]
          : []),
        { label: "CPM realizado", value: m.cpm, format: currencyCentsFormat },
        { label: "Cliques", value: m.clicks },
        { label: "CTR", value: m.ctr, format: percentTwo },
      ];
    case "trafego":
      return [
        { label: "Cliques", value: m.clicks },
        { label: "CPC realizado", value: m.cpc, format: currencyCentsFormat },
        { label: "Impressões", value: m.impressions },
        { label: "CTR", value: m.ctr, format: percentTwo },
        { label: "CPM", value: m.cpm, format: currencyCentsFormat },
      ];
    case "visualizacoes":
      return [
        clicksInsteadOfMetric ? { label: "Cliques", value: m.clicks } : { label: "Visualizações", value: m.views },
        { label: "CPV realizado", value: m.cpv, format: currencyCentsFormat },
        { label: "Impressões", value: m.impressions },
        { label: "VTR", value: m.vtr, format: percentOneDigitFormat, hint: "visualizações ÷ impressões" },
      ];
    case "escutas":
      return [
        { label: "Escutas completas", value: m.listens },
        { label: "CPE realizado", value: m.cpe, format: currencyCentsFormat },
        { label: "Taxa de conclusão", value: m.completionRate, format: percentOneDigitFormat, hint: "escutas ÷ inícios" },
        { label: "Impressões", value: m.impressions },
        { label: "Alcance", value: m.reach, hint: "ouvintes únicos" },
        { label: "Frequência", value: m.frequency, format: decimalOne },
        { label: "CPM", value: m.cpm, format: currencyCentsFormat },
        { label: "Cliques", value: m.clicks },
        { label: "CTR", value: m.ctr, format: percentTwo },
      ];
    case "disparos":
      return [
        { label: "Disparos enviados", value: m.sent },
        { label: "Entregues", value: m.delivered },
        { label: "Taxa de entrega", value: m.deliveryRate, format: percentOneDigitFormat },
        // Leitura e cliques só quando a fonte informar (a planilha ainda não traz).
        ...(m.readRate > 0
          ? [{ label: "Taxa de leitura", value: m.readRate, format: percentOneDigitFormat, hint: "sobre entregues" }]
          : []),
        ...(m.clicks > 0
          ? [
              { label: "Cliques", value: m.clicks },
              { label: "CTR", value: m.ctr, format: percentOneDigitFormat, hint: "cliques ÷ entregues" },
            ]
          : []),
      ];
  }
}

/** Grade compacta das métricas complementares da estratégia. */
export function ComplementaryMetrics({
  metrics,
  color,
  clicksInsteadOfMetric = false,
}: {
  metrics: Metrics;
  color: string;
  clicksInsteadOfMetric?: boolean;
}) {
  const items = complementaryItems(metrics, clicksInsteadOfMetric);
  return (
    <dl className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <div className="rounded-xl bg-muted/60 px-3 py-2" key={item.label}>
          <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="truncate font-heading text-lg font-extrabold leading-tight tracking-tight" style={{ color }}>
            <CountUp delay={index * 60} format={item.format} value={item.value} />
          </dd>
          {item.hint ? <dd className="truncate text-[10px] text-muted-foreground">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

import type { Metadata } from "next";
import { Gauge, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { KpiCard } from "@/components/campaign/kpi-card";
import { GoalCarousel } from "@/components/campaign/goal-carousel";
import { ProgressBar } from "@/components/campaign/progress-bar";
import { currencyFormat } from "@/components/motion/count-up";
import { getCampaignSummary } from "@/data";
import { getLineDatasets } from "@/data/server";
import { formatCurrencyInt } from "@/lib/format";

export const metadata: Metadata = { title: "Progresso de metas" };

// Dados reais das APIs com cache de 1h.
export const revalidate = 3600;

export default async function GoalsPage() {
  const summary = getCampaignSummary(await getLineDatasets());

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4 fit:grid fit:h-full fit:grid-rows-[auto_minmax(0,1fr)]">
      <section aria-label="Metas da campanha" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          accent="var(--brand-blue)"
          className="col-span-2 sm:col-span-3 xl:col-span-2"
          format={currencyFormat}
          icon={Wallet}
          label="Investimento total"
          value={summary.spent}
        >
          <ProgressBar
            className="mt-1"
            color="var(--brand-blue)"
            complete={summary.investmentComplete}
            label={`de ${formatCurrencyInt(summary.totalInvestment)} contratados · travado em 100%`}
            progress={summary.investmentProgress}
            size="sm"
            variant="investment"
          />
        </KpiCard>
        <KpiCard
          accent="var(--brand-cyan)"
          format={{ style: "percent", maximumFractionDigits: 0 }}
          hint={`${summary.daysElapsed} de ${summary.daysTotal} dias · ${summary.daysRemaining} restantes`}
          icon={Gauge}
          label="Ritmo esperado"
          value={summary.expectedProgress}
        />
        <KpiCard accent="var(--status-good-foreground)" colored hint="linhas à frente do ritmo" icon={TrendingUp} label="Acima do ritmo" value={summary.counts.acima} />
        <KpiCard accent="var(--status-neutral-foreground)" colored hint={summary.withoutData > 0 ? `±3 pp · ${summary.withoutData} sem dados` : "dentro de ±3 pp do esperado"} label="No ritmo" value={summary.counts["no-ritmo"]} />
        <KpiCard accent="var(--status-warn-foreground)" colored hint="linhas que pedem atenção" icon={TrendingDown} label="Abaixo do ritmo" value={summary.counts.abaixo} />
      </section>

      <GoalCarousel summaries={summary.lines} />
    </div>
  );
}

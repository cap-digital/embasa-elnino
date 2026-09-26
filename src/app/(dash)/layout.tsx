import { BrandScanner } from "@/components/landing/brand-scanner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCampaignSummary } from "@/data";
import { getLineDatasets } from "@/data/server";

/** Shell do painel: sidebar colapsável + área principal. */
export default async function DashLayout({ children }: LayoutProps<"/">) {
  // Horário da última busca nas APIs, para o botão "Atualizar dados".
  const { lastUpdated } = getCampaignSummary(await getLineDatasets());
  return (
    <div className="relative flex h-full flex-col lg:flex-row">
      {/* Fundo animado bem suave (atrás dos cards), nas cores da campanha. */}
      <BrandScanner
        brightness={0.9}
        className="fixed z-0"
        color1="#0757b0"
        color2="#1ab3c9"
        color3="#77ba39"
        glow={0.18}
        grain={false}
        mouseStrength={0.35}
        opacity={0.22}
        ripple={0.22}
        scanline={false}
        speed={0.18}
        sweepSpeed={0.1}
        vignette={0.25}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <AppSidebar lastUpdated={lastUpdated} />
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

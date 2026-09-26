import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCampaignSummary } from "@/data";
import { getLineDatasets } from "@/data/server";

/** Shell do painel: sidebar colapsável + área principal. */
export default async function DashLayout({ children }: LayoutProps<"/">) {
  // Horário da última busca nas APIs, para o botão "Atualizar dados".
  const { lastUpdated } = getCampaignSummary(await getLineDatasets());
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <AppSidebar lastUpdated={lastUpdated} />
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
}

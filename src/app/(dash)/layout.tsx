import { AppSidebar } from "@/components/layout/app-sidebar";

/** Shell do painel: sidebar colapsável + área principal. */
export default function DashLayout({ children }: LayoutProps<"/"> ) {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <AppSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
}

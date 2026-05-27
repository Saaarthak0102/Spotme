import {
  EventsGrid,
  HeroSummary,
  PlanCard,
  StorageCard,
} from "@/components/dashboard/dashboard-cards";
import { DashboardShell } from "@/components/dashboard/shell";

export default function DashboardPage() {
  return (
    <DashboardShell active="Dashboard">
      <main className="p-4 sm:p-6 lg:p-9">
        <HeroSummary />
        <div className="grid gap-5 2xl:grid-cols-[1fr_352px] sm:gap-7">
          <EventsGrid />
          <aside className="space-y-4 sm:space-y-5">
            <StorageCard />
            <PlanCard />
          </aside>
        </div>
      </main>
    </DashboardShell>
  );
}

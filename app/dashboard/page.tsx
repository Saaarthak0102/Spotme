import { redirect } from "next/navigation";
import {
  EventsGrid,
  HeroSummary,
  PlanCard,
  StorageCard,
} from "@/components/dashboard/dashboard-cards";
import { DashboardShell } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { fetchEvents, fetchDashboardStats } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch real data in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileQuery = (supabase as any)
    .from("profiles")
    .select("full_name, plan, max_events, max_storage_gb")
    .eq("id", user.id)
    .single();

  const [events, stats, profileResult] = await Promise.all([
    fetchEvents(),
    fetchDashboardStats(),
    profileQuery,
  ]);

  const profileData = profileResult.data as {
    full_name: string | null;
    plan: "free" | "starter" | "pro" | "studio_basic" | "studio_pro" | "custom";
    max_events: number;
    max_storage_gb: number;
  } | null;

  const userName = profileData?.full_name ?? user.email ?? undefined;
  const userPlan = profileData?.plan ?? "free";
  const maxEvents = profileData?.max_events ?? 1;
  const maxStorageGB = profileData?.max_storage_gb ?? 10;

  // Calculate real used storage from all event photos
  const eventIds = events.map((e) => e.id);
  let totalStorageBytes = 0;
  if (eventIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photosData } = await (supabase as any)
      .from("event_photos")
      .select("file_size_bytes")
      .in("event_id", eventIds);

    totalStorageBytes = (photosData ?? []).reduce(
      (acc: number, p: { file_size_bytes: number | null }) => acc + (p.file_size_bytes ?? 0),
      0
    );
  }

  return (
    <DashboardShell active="Dashboard" userName={userName}>
      <main className="p-4 sm:p-6 lg:p-9">
        <HeroSummary
          userName={userName}
          totalEvents={stats.totalEvents}
          totalPhotos={stats.totalPhotos}
        />
        <div className="grid gap-5 2xl:grid-cols-[1fr_352px] sm:gap-7">
          <EventsGrid events={events} />
          <aside className="space-y-4 sm:space-y-5">
            <StorageCard usedBytes={totalStorageBytes} maxGB={maxStorageGB} />
            <PlanCard
              plan={userPlan}
              eventsUsed={events.length}
              maxEvents={maxEvents}
              usedBytes={totalStorageBytes}
              maxGB={maxStorageGB}
            />
          </aside>
        </div>
      </main>
    </DashboardShell>
  );
}

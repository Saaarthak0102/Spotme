import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EventWorkspaceShell, PageHeading } from "@/components/dashboard/shell";
import { checkEventAccess } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

// No more static params — fully dynamic routing
export function workspaceParams() {
  return [];
}

export async function WorkspacePage({
  eventId,
  activePath,
  eyebrow,
  title,
  detail,
  action,
  children,
}: {
  eventId: string;
  activePath: string;
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await checkEventAccess(eventId);

  if (!access.event) {
    notFound();
  }

  if (access.isCollaborator) {
    // Collaborators can only access uploads and gallery
    if (activePath !== "/uploads" && activePath !== "/gallery") {
      if (activePath === "") {
        redirect(`/dashboard/events/${eventId}/gallery`);
      } else {
        notFound();
      }
    }
  }

  let userName: string | undefined;
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = (data as { full_name: string | null } | null)?.full_name ?? user.email ?? undefined;
  }

  return (
    <EventWorkspaceShell event={access.event} activePath={activePath} userName={userName} isCollaborator={access.isCollaborator}>
      <main className="p-4 sm:p-6 lg:p-9">
        <PageHeading eyebrow={eyebrow} title={title} detail={detail} action={action} />
        {children}
      </main>
    </EventWorkspaceShell>
  );
}

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CoreLoopStage } from "@/lib/coreLoop";

type EngagementEventPayload = {
  stage: CoreLoopStage;
  surface: "feed" | "ranking" | "profile" | "space" | "search";
  action: string;
  entityType?: "post" | "product" | "user" | "space" | "tag";
  entityId?: string | null;
};

let analyticsTableUnavailable = false;

export async function trackEngagementEvent(payload: EngagementEventPayload) {
  if (analyticsTableUnavailable) return;

  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("engagement_events").insert({
    user_id: user.id,
    stage: payload.stage,
    surface: payload.surface,
    action: payload.action,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
  });

  if (!error) return;

  const missingTable =
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /engagement_events/i.test(error.message);

  if (missingTable) {
    analyticsTableUnavailable = true;
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[engagement_events] table missing in Supabase. Run supabase/schema.sql to enable analytics."
      );
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[engagement_events] insert failed:", error.message);
  }
}


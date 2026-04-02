"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { AppShell } from "@/components/shell/AppShell";
import { SpaceChatView, type SpaceSummary } from "@/features/spaces/SpaceChatView";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";

export default function SpacePage() {
  const params = useParams();
  const code = typeof params?.code === "string" ? params.code : "";
  const [space, setSpace] = useState<SpaceSummary | null | "loading" | "not_found">("loading");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setSpace("not_found");
      return () => {
        cancelled = true;
      };
    }
    supabase
      .from("spaces")
      .select("id, code, name, icon_url, created_by")
      .eq("code", code)
      .single()
      .then(({ data, error }: { data: unknown; error: PostgrestError | null }) => {
        if (cancelled) return;
        if (error || !data) {
          setSpace("not_found");
          return;
        }
        setSpace(data as SpaceSummary);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code) {
    return (
      <AppShell active="feeds">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-slate-400">Space not found.</p>
          <Link href="/feeds" prefetch={false} className="mt-4 text-sky-400 hover:underline">
            Back to Feeds
          </Link>
        </div>
      </AppShell>
    );
  }

  if (space === "not_found" || space === "loading") {
    return (
      <AppShell active="feeds">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          {space === "not_found" ? (
            <>
              <p className="text-slate-400">Space not found.</p>
              <Link href="/feeds" prefetch={false} className="mt-4 text-sky-400 hover:underline">
                Back to Feeds
              </Link>
            </>
          ) : (
            <p className="text-slate-500">Loading space…</p>
          )}
        </div>
      </AppShell>
    );
  }

  return <SpaceChatView space={space} navActive="feeds" />;
}

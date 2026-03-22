"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { AppShell } from "@/components/shell/AppShell";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { shellLaunchGradientClass } from "@/lib/ui/appShellClasses";
import type { SpaceSummary } from "@/features/spaces/SpaceChatView";

type LoadState =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "ready"; space: SpaceSummary; isMember: boolean };

export default function SpaceInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params?.spaceId === "string" ? params.spaceId : "";
  const { user, ready } = useAuthSnapshot();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (user) return;
    if (!code) return;
    const next = encodeURIComponent(`/invite/${code}`);
    router.replace(`/login?redirect=${next}`);
  }, [ready, user, code, router]);

  const load = useCallback(async () => {
    if (!code || !user?.id) return;
    setState({ kind: "loading" });
    const supabase = getSupabaseBrowserClient();
    const { data: row, error }: { data: unknown; error: PostgrestError | null } = await supabase
      .from("spaces")
      .select("id, code, name, icon_url, created_by")
      .eq("code", code)
      .single();

    if (error || !row) {
      setState({ kind: "not_found" });
      return;
    }
    const space = row as SpaceSummary;
    const creator = space.created_by === user.id;

    const { data: memberRow } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("space_id", space.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isMember = creator || !!memberRow;
    setState({
      kind: "ready",
      space: {
        id: space.id,
        code: space.code,
        name: space.name,
        icon_url: space.icon_url,
        created_by: space.created_by,
      },
      isMember,
    });
  }, [code, user?.id]);

  useEffect(() => {
    if (!ready || !user?.id || !code) return;
    void load();
  }, [ready, user?.id, code, load]);

  const handleJoin = async () => {
    if (state.kind !== "ready" || state.isMember || !user?.id) return;
    setJoinError(null);
    setJoinBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("space_members").insert({
        space_id: state.space.id,
        user_id: user.id,
      });
      if (error) {
        if (error.code === "23505") {
          router.push(`/${state.space.code}`);
          return;
        }
        setJoinError(error.message);
        return;
      }
      router.push(`/${state.space.code}`);
    } finally {
      setJoinBusy(false);
    }
  };

  if (!code) {
    return (
      <AppShell active="feeds" hideSidebar>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-slate-400">Invalid invite link.</p>
          <Link href="/feeds" prefetch={false} className="mt-4 text-sky-400 hover:underline">
            Back to Feeds
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!ready || !user) {
    return (
      <AppShell active="feeds">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-slate-500">Redirecting to sign in…</p>
        </div>
      </AppShell>
    );
  }

  if (state.kind === "loading") {
    return (
      <AppShell active="feeds" hideSidebar>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-slate-500">Loading invite…</p>
        </div>
      </AppShell>
    );
  }

  if (state.kind === "not_found") {
    return (
      <AppShell active="feeds">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-slate-400">This invite isn&apos;t valid or the space no longer exists.</p>
          <Link href="/feeds" prefetch={false} className="mt-4 text-sky-400 hover:underline">
            Back to Feeds
          </Link>
        </div>
      </AppShell>
    );
  }

  const { space, isMember } = state;

  return (
    <AppShell active="feeds" hideSidebar>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/5 bg-white/[0.03] p-6 ring-1 ring-white/5 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
              {space.icon_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={space.icon_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white/90">{space.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {isMember ? "You’re in this space" : "You’ve been invited to join"}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{space.name}</h1>
          </div>

          {isMember ? (
            <Link
              href={`/${space.code}`}
              prefetch={false}
              className={`flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 ${shellLaunchGradientClass}`}
            >
              View Space
            </Link>
          ) : (
            <div className="space-y-3">
              {joinError && <p className="text-center text-xs font-medium text-rose-400">{joinError}</p>}
              <button
                type="button"
                disabled={joinBusy}
                onClick={() => void handleJoin()}
                className={`w-full rounded-xl py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${shellLaunchGradientClass}`}
              >
                {joinBusy ? "Joining…" : "Join Space"}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            <Link href="/feeds" prefetch={false} className="text-sky-400/90 hover:text-sky-300 hover:underline">
              Back to Feeds
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";

type Space = { id: string; code: string; name: string; icon_url: string | null };

function spaceInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

function SpaceSkeleton() {
  return (
    <div
      className="h-16 w-16 shrink-0 animate-pulse rounded-3xl bg-white/10 ring-1 ring-white/10"
      aria-hidden
    />
  );
}

export function AppSidebarSpacesList() {
  const pathname = usePathname();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setSpaces([]);
      setLoading(false);
      return;
    }
    const chRef: { current: ReturnType<typeof supabase.channel> | null } = { current: null };
    let cancelled = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSpaces([]);
        setLoading(false);
        return;
      }
      const { data: memberships, error: memErr } = await supabase
        .from("space_members")
        .select("space_id, joined_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });
      if (memErr) {
        console.error("sidebar space_members:", memErr);
        setSpaces([]);
      } else if (!memberships?.length) {
        setSpaces([]);
      } else {
        const ids = memberships.map((m: { space_id: string }) => m.space_id);
        const { data: spaceRows, error: spErr } = await supabase
          .from("spaces")
          .select("id, code, name, icon_url")
          .in("id", ids);
        if (spErr) {
          console.error("sidebar spaces:", spErr);
          setSpaces([]);
        } else {
          const rows = (spaceRows ?? []) as Space[];
          const byId = new Map(rows.map((s) => [s.id, s]));
          const list: Space[] = [];
          for (const m of memberships as { space_id: string }[]) {
            const s = byId.get(m.space_id);
            if (s?.id && s?.code) list.push(s);
          }
          setSpaces(list);
        }
      }
      setLoading(false);
    };

    void (async () => {
      await load();
      if (cancelled) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const ch = supabase.channel(uid ? `sidebar-spaces:${uid}` : "sidebar-spaces:anon");
      ch.on("postgres_changes", { event: "*", schema: "public", table: "spaces" }, () => load());
      if (uid) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "space_members", filter: `user_id=eq.${uid}` },
          () => load(),
        );
      }
      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      chRef.current = ch;
      await ch.subscribe();
    })();

    return () => {
      cancelled = true;
      const c = chRef.current;
      chRef.current = null;
      if (c) supabase.removeChannel(c);
    };
  }, []);

  if (loading) {
    return (
      <>
        <SpaceSkeleton />
        <SpaceSkeleton />
      </>
    );
  }

  if (spaces.length === 0) return null;

  return (
    <>
      {spaces.map((space) => {
        const href = `/${space.code}`;
        const isActive = pathname === href;
        return (
          <Link
            key={space.id}
            href={href}
            prefetch={false}
            aria-label={space.name}
            title={space.name}
            className={`relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-white/5 shadow-md ring-1 ring-white/10 transition hover:opacity-95 hover:ring-white/20 ${
              isActive ? "ring-2 ring-white/25 ring-offset-[3px] ring-offset-[#080c14]" : ""
            }`}
          >
            {space.icon_url ? (
              <img
                src={space.icon_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="select-none text-lg font-bold tabular-nums text-white/95 drop-shadow-sm">
                {spaceInitial(space.name)}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

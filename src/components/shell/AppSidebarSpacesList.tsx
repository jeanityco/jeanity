"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
    const supabase = getSupabaseBrowserClient();
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSpaces([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("spaces")
        .select("id, code, name, icon_url")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setSpaces((data ?? []) as Space[]);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("sidebar-spaces").on("postgres_changes", { event: "*", schema: "public", table: "spaces" }, () => load()).subscribe();
    return () => {
      supabase.removeChannel(ch);
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

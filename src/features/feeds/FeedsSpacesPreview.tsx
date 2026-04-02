"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PREVIEW_TEXT } from "@/features/feeds/feedUi";

type SpacePreview = {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
};

export function FeedsSpacesPreview() {
  const [spaces, setSpaces] = useState<SpacePreview[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 4;
    const right = max > 4 && el.scrollLeft < max - 4;
    queueMicrotask(() => {
      setCanScrollLeft(left);
      setCanScrollRight(right);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase
        .from("spaces")
        .select("id, code, name, icon_url")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (cancelled) return;
      const list = (data ?? []) as SpacePreview[];
      setSpaces(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, spaces.length]);

  if (spaces.length === 0) return null;

  return (
    <section className="feed-preview-surface relative p-3.5">
      <h3 className={`${PREVIEW_TEXT.title} mb-2`}>Spaces to join</h3>
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#070b14] via-[#070b14]/75 to-transparent" />
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
            className="absolute left-1 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0f1419]/95 text-lg text-white shadow-lg backdrop-blur-sm transition hover:bg-[#1a2332] hover:border-white/25 lg:flex"
            aria-label="Scroll spaces left"
          >
            ‹
          </button>
        </>
      )}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#070b14] via-[#070b14]/75 to-transparent" />
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
            className="absolute right-1 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0f1419]/95 text-lg text-white shadow-lg backdrop-blur-sm transition hover:bg-[#1a2332] hover:border-white/25 lg:flex"
            aria-label="Scroll spaces right"
          >
            ›
          </button>
        </>
      )}

      <div ref={scrollRef} className="scrollbar-hide overflow-x-auto overflow-y-visible pr-0.5">
        <ul className="flex w-max gap-3">
          {spaces.map((space) => (
            <li key={space.id} className="w-[320px] max-w-[84vw] shrink-0">
              <article className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0f1419] ring-1 ring-white/[0.08]">
                {space.icon_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={space.icon_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/45" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[linear-gradient(145deg,#1b2f4a_0%,#193a39_46%,#132131_100%)]" />
                    <div className="absolute inset-0 bg-black/35" />
                  </>
                )}
                <div className="relative p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black/30 ring-1 ring-white/15">
                      {space.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={space.icon_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {space.name.charAt(0).toUpperCase() || "S"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[1.35rem] font-bold tracking-tight text-white">{space.name}</p>
                      <p className="text-sm text-white/75">/{space.code}</p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-base leading-relaxed text-white/90">
                    Welcome to {space.name}. Join the conversation, updates, and creator vibes on Jeanity.
                  </p>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <Link
                      href={`/invite/${space.code}`}
                      prefetch={false}
                      className="rounded-2xl border border-white/15 bg-white/20 px-4 py-2 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


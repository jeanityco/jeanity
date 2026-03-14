"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
} from "@/components/AppSidebar";
type ChatRow = {
  id: string;
  from: "them" | "me";
  author: string;
  authorColor: string;
  when: string;
  text?: string;
  kind?: "text" | "audio" | "sticker";
  audioDuration?: string;
  reactions?: { label: string; count: number }[];
};

const AUTHOR_AVATAR: Record<string, string> = {
  Maya: "M",
  Jordan: "J",
  Sam: "S",
  Alex: "A",
  You: "Y",
  Riley: "R",
};

const CHAT_MESSAGES: ChatRow[] = [
  {
    id: "1",
    from: "them",
    author: "Maya",
    authorColor: "#a78bfa",
    when: "Today at 7:02 PM",
    text: "Anyone free to review the hero section before we push to staging?",
  },
  {
    id: "2",
    from: "them",
    author: "Jordan",
    authorColor: "#34d399",
    when: "Today at 7:03 PM",
    text: "On it—dropped comments in Figma already.",
  },
  {
    id: "3",
    from: "them",
    author: "Maya",
    authorColor: "#a78bfa",
    when: "Today at 7:04 PM",
    text: "Quick Loom walkthrough of the scroll animation 👇",
    kind: "audio",
    audioDuration: "1:30",
  },
  {
    id: "4",
    from: "them",
    author: "Sam",
    authorColor: "#f472b6",
    when: "Today at 7:06 PM",
    kind: "sticker",
    reactions: [
      { label: "✨", count: 8 },
      { label: "🔥", count: 3 },
    ],
  },
  {
    id: "5",
    from: "them",
    author: "Maya",
    authorColor: "#a78bfa",
    when: "Today at 7:08 PM",
    text: "Who’s got ref sites for brutalist landing pages?",
    reactions: [
      { label: "✨", count: 8 },
      { label: "🔥", count: 3 },
    ],
  },
  {
    id: "6",
    from: "me",
    author: "You",
    authorColor: "#38bdf8",
    when: "Today at 7:10 PM",
    text: "Pulled a few frames—thinking emerald accents + sky CTAs to match Jeanity. @Riley does that fit the brand kit?",
  },
  {
    id: "7",
    from: "them",
    author: "Riley",
    authorColor: "#22d3ee",
    when: "Today at 7:11 PM",
    text: "Perfect. Ship it.",
  },
];

const TEXT_CHANNELS: { id: string; name: string; icon: "hash" | "megaphone" }[] = [
  { id: "updates", name: "updates", icon: "megaphone" },
  { id: "inspo", name: "inspo", icon: "hash" },
  { id: "general", name: "general", icon: "hash" },
];

const DESIGN_SUB: { id: string; name: string }[] = [
  { id: "figma-sync", name: "figma-sync" },
  { id: "motion-lab", name: "motion-lab" },
];

const LIVE_USERS: { name: string; avatar: string; muted?: boolean; video?: boolean }[] = [
  { name: "Alex", avatar: "A", muted: true, video: true },
  { name: "Sam", avatar: "S" },
  { name: "Maya", avatar: "M" },
  { name: "Jordan", avatar: "J" },
];

export default function MessagesPage() {
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");
  const [voiceOpen, setVoiceOpen] = useState(true);

  const activeChannel =
    TEXT_CHANNELS.find((c) => c.id === activeChannelId)?.name ??
    DESIGN_SUB.find((c) => c.id === activeChannelId)?.name ??
    activeChannelId;

  const CHANNEL_TOPICS: Record<string, string> = {
    general: "Design, builds, and what’s shipping on Jeanity.",
    updates: "Product updates and release notes.",
    inspo: "Sites, motion, and references worth saving.",
    "figma-sync": "Frames, handoff, and component talk.",
    "motion-lab": "Animation, scroll, and micro-interactions.",
  };

  const openChannel = (id: string) => {
    setActiveChannelId(id);
    setMobilePanel("chat");
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white antialiased lg:flex">
      <AppBackground />
      <AppSidebar active="messages" />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col pb-28 lg:h-screen lg:pb-0">
        {/* Desktop: full-height 3 columns inside */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* —— Spaces rail + channels (Jeanity UI) —— */}
          <div
            className={`flex min-h-0 w-full shrink-0 overflow-hidden border-r border-white/5 bg-[#080c14] lg:w-[min(100%,280px)] lg:max-w-[280px] lg:min-w-0 ${
              mobilePanel === "chat" ? "hidden lg:flex" : "flex"
            }`}
          >
            <aside className="scrollbar-hide flex min-h-0 min-w-0 w-full flex-1 flex-col bg-[#0a0e1a]/95 backdrop-blur-sm">
              <div className="shrink-0 border-b border-white/5 bg-gradient-to-br from-emerald-600/30 via-[#0a0e1a] to-sky-600/25 px-3 pb-3 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-[15px] font-bold tracking-tight text-white">VibeHive</h2>
                  <button type="button" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Space menu">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Creators · design · ship</p>
                <div className="mt-3 flex h-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03]">
                  <span className="text-2xl opacity-90" aria-hidden>
                    ✦
                  </span>
                </div>
              </div>
              <div className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 pb-4 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <span className="opacity-80">📅</span>
                  <span>2 live sessions</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <span className="opacity-80">🔍</span>
                  <span>Browse channels</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <span className="opacity-80">👥</span>
                  <span>Members</span>
                </button>
                <div className="my-2 h-px bg-white/5" />
                {TEXT_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => openChannel(ch.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[15px] transition ${
                      activeChannelId === ch.id
                        ? "bg-white/10 font-medium text-white ring-1 ring-white/10"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {ch.icon === "megaphone" ? (
                      <span className="flex h-4 w-4 shrink-0 text-sky-400/90">📢</span>
                    ) : (
                      <span className="w-4 shrink-0 text-center text-sky-400/80">#</span>
                    )}
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
                <div className="pt-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                    design
                  </button>
                  <div className="relative ml-2 border-l border-emerald-500/20 pl-2">
                    {DESIGN_SUB.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => openChannel(ch.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition ${
                          activeChannelId === ch.id
                            ? "bg-white/10 text-white ring-1 ring-white/10"
                            : "text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        <span className="w-4 shrink-0 text-center text-sky-400/70">#</span>
                        <span className="truncate">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="my-2 h-px bg-white/5" />
                <button
                  type="button"
                  onClick={() => setVoiceOpen(!voiceOpen)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400"
                >
                  <span>Live audio</span>
                  <svg className={`h-3 w-3 transition ${voiceOpen ? "" : "-rotate-90"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </button>
                {voiceOpen && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-500">
                      <span className="opacity-60">🔈</span>
                      <span className="truncate">critique-night</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-emerald-400">
                        <span>🔊</span>
                        <span>studio-floor</span>
                      </div>
                      <ul className="space-y-0.5 pl-3 pt-1">
                        {LIVE_USERS.map((u) => (
                          <li
                            key={u.name}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 text-[13px] text-slate-300"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500/80 to-emerald-600/80 text-[10px] font-bold text-white">
                              {u.avatar}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{u.name}</span>
                            <span className="flex shrink-0 gap-1 text-slate-500">
                              {u.video && (
                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
                                </svg>
                              )}
                              {u.muted && (
                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.96H5c0 3.41 2.72 6.23 6 6.72V22h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                                </svg>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>

          {/* —— Chat (Jeanity) —— */}
          <section
            className={`flex min-h-0 min-w-0 flex-1 flex-col border-r border-white/5 bg-[#0a0e1a] ${
              mobilePanel === "list" ? "hidden lg:flex" : "flex"
            }`}
          >
            <header className="z-10 flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/5 bg-[#0a0e1a]/90 px-4 py-2 backdrop-blur-xl">
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Back"
                onClick={() => setMobilePanel("list")}
              >
                ←
              </button>
              <span className="text-sky-400/90">#</span>
              <h2 className="truncate text-base font-semibold text-white">{activeChannel}</h2>
              <span className="hidden h-1 w-1 shrink-0 rounded-full bg-slate-600 sm:block" aria-hidden />
              <p className="hidden min-w-0 flex-1 truncate text-sm text-slate-500 sm:block">
                {CHANNEL_TOPICS[activeChannelId] ?? CHANNEL_TOPICS.general}
              </p>
            </header>

            <div className="scrollbar-hide flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[100%] px-4 pb-6 pt-4">
                {CHAT_MESSAGES.map((m) => (
                  <article
                    key={m.id}
                    className="group -mx-2 flex gap-4 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]"
                  >
                    <div
                      className="mt-0.5 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-slate-200 ring-1 ring-white/10"
                      aria-hidden
                    >
                      {AUTHOR_AVATAR[m.author] ?? m.author.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span className="cursor-default font-semibold" style={{ color: m.authorColor }}>
                          {m.author}
                        </span>
                        <time className="text-xs font-medium text-slate-500">{m.when}</time>
                      </div>
                      {m.kind === "audio" && (
                        <div className="mt-2 max-w-md">
                          {m.text && <p className="text-[15px] leading-relaxed text-slate-300">{m.text}</p>}
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-3 py-2 shadow-lg shadow-emerald-500/10 ring-1 ring-white/10">
                            <button
                              type="button"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                              aria-label="Play"
                            >
                              <span className="ml-0.5 block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                            </button>
                            <div className="flex h-8 flex-1 items-center gap-px overflow-hidden rounded opacity-95">
                              {Array.from({ length: 48 }).map((_, i) => (
                                <span
                                  key={i}
                                  className="w-0.5 rounded-full bg-white/80"
                                  style={{ height: `${8 + ((i * 17) % 20)}px` }}
                                />
                              ))}
                            </div>
                            <span className="shrink-0 text-xs font-medium tabular-nums text-white">
                              {m.audioDuration}
                            </span>
                          </div>
                        </div>
                      )}
                      {m.kind === "sticker" && (
                        <div className="mt-1">
                          <div className="inline-flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-5xl ring-1 ring-white/10">
                            ✨
                          </div>
                          {m.reactions && m.reactions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {m.reactions.map((r) => (
                                <button
                                  key={r.label}
                                  type="button"
                                  className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-0.5 text-sm hover:border-emerald-500/30 hover:bg-white/10"
                                >
                                  <span>{r.label}</span>
                                  <span className="text-xs text-slate-400">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {(m.kind === "text" || !m.kind) && m.text && (
                        <>
                          <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-300">
                            {m.text.split(/(@\w+)/g).map((part, i) =>
                              part.startsWith("@") ? (
                                <span
                                  key={i}
                                  className="rounded bg-sky-500/15 px-0.5 font-medium text-sky-300"
                                >
                                  {part}
                                </span>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </p>
                          {m.reactions && m.reactions.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {m.reactions.map((r) => (
                                <button
                                  key={r.label}
                                  type="button"
                                  className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-0.5 text-sm hover:border-emerald-500/30"
                                >
                                  <span>{r.label}</span>
                                  <span className="text-xs text-slate-400">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/5 bg-[#0a0e1a] px-4 pb-6 pt-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 ring-1 ring-emerald-500/10">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-emerald-400"
                  aria-label="Attach"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder={`Message #${activeChannel}`}
                  className="min-h-[44px] flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  className="hidden rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 sm:block"
                >
                  Send
                </button>
              </div>
            </footer>
          </section>

          {/* —— Group info (desktop) —— */}
          <aside className="hidden w-[280px] shrink-0 flex-col border-l border-white/5 bg-[#080c14] xl:flex">
            <div className="border-b border-white/5 px-4 py-3">
              <h3 className="font-semibold tracking-tight text-white">Space info</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">VibeHive</p>
            </div>
            <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">About</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Where creators meet. Elevate your vibe on Jeanity—threads, design feedback, and ship updates.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Link</p>
                <p className="mt-1 truncate text-sm font-medium text-sky-400">jeanity.app/vibehive</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <span>🔔</span> Notifications
                </span>
                <span className="h-5 w-9 rounded-full bg-gradient-to-r from-emerald-500/50 to-sky-500/50 ring-1 ring-emerald-400/30" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Members</p>
                <ul className="mt-2 space-y-2">
                  {["Guy Hawkins", "Lead Frans", "Floyd Miles"].map((n) => (
                    <li key={n} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/40 to-emerald-600/40 text-xs font-bold text-white ring-1 ring-white/10">
                        {n.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{n}</p>
                        <p className="text-[10px] text-slate-500">On Jeanity</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/feeds"
                className="block rounded-xl border border-emerald-500/25 py-2.5 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
              >
                Back to Feeds
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <AppMobileNav active="messages" />
    </main>
  );
}

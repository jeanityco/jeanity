"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
} from "@/components/AppSidebar";
type Thread = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  avatar: string;
  typing?: string;
};

const THREADS: Thread[] = [
  {
    id: "vibehive",
    name: "VibeHive",
    preview: "Someone is typing…",
    time: "4m",
    unread: 12,
    avatar: "✦",
    typing: "Victor is typing…",
  },
  {
    id: "jeanity",
    name: "Jeanity Team",
    preview: "Thanks for being an early member!",
    time: "1h",
    avatar: "J",
  },
  {
    id: "pm",
    name: "PM Okta",
    preview: "i see, okay noted! i'll sync with design",
    time: "10m",
    avatar: "O",
  },
  {
    id: "lead",
    name: "Lead Frans",
    preview: "ok, thanks!",
    time: "now",
    avatar: "F",
  },
  {
    id: "group",
    name: "Product sync",
    preview: "Floyd: let's ship the beta next week",
    time: "2h",
    unread: 2,
    avatar: "◎",
  },
];

const CHAT_MESSAGES: {
  id: string;
  from: "them" | "me";
  author?: string;
  text: string;
  time: string;
}[] = [
  { id: "1", from: "them", author: "Lead Frans", text: "Morning! Did you get a chance to review the wireframes?", time: "01.18 AM" },
  { id: "2", from: "them", author: "Floyd Miles", text: "Sharing the Figma link in a sec.", time: "01.19 AM" },
  { id: "3", from: "me", text: "I've got a few sketches already. Thinking of incorporating some sleek animations for the website interface. What do you all think?", time: "01.32 AM" },
  { id: "4", from: "them", author: "Guy Hawkins", text: "Love that direction—matches the Jeanity vibe.", time: "01.35 AM" },
];

export default function MessagesPage() {
  const [activeId, setActiveId] = useState("vibehive");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");
  const active = THREADS.find((t) => t.id === activeId) ?? THREADS[0];

  const openChat = (id: string) => {
    setActiveId(id);
    setMobilePanel("chat");
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white antialiased lg:flex">
      <AppBackground />
      <AppSidebar active="messages" />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col pb-28 lg:h-screen lg:pb-0">
        {/* Desktop: full-height 3 columns inside */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* —— Conversation list —— */}
          <aside
            className={`flex w-full shrink-0 flex-col border-white/10 bg-[#0c1018] lg:w-[320px] lg:border-r xl:w-[360px] ${
              mobilePanel === "chat" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 lg:px-5">
              <h1 className="text-lg font-bold tracking-tight text-white">Messages</h1>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label="Compose"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
                <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="More">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="border-b border-white/8 p-3 lg:px-4">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="Search"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0e14] py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>
            <div className="scrollbar-hide flex-1 overflow-y-auto">
              {THREADS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openChat(t.id)}
                  className={`flex w-full items-start gap-3 border-l-[3px] px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                    activeId === t.id
                      ? "border-sky-400 bg-sky-500/10"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600/50 to-sky-600/50 text-sm font-bold text-white/95 ring-2 ring-white/10">
                    {t.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{t.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{t.time}</span>
                    </div>
                    <p
                      className={`truncate text-xs ${t.typing ? "text-sky-400/90" : "text-slate-500"}`}
                    >
                      {t.typing || t.preview}
                    </p>
                  </div>
                  {t.unread != null && t.unread > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {t.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* —— Active chat —— */}
          <section
            className={`flex min-h-0 min-w-0 flex-1 flex-col bg-[#080b10] lg:border-r lg:border-white/5 ${
              mobilePanel === "list" ? "hidden lg:flex" : "flex"
            }`}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-[#0a0e14]/95 px-3 py-3 backdrop-blur-sm sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
                  aria-label="Back"
                  onClick={() => setMobilePanel("list")}
                >
                  ←
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-lg ring-2 ring-emerald-400/20">
                  {active.avatar}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-white">{active.name}</h2>
                  <p className="truncate text-xs text-sky-400/80">
                    {active.typing || "Online on Jeanity"}
                  </p>
                </div>
              </div>
            </header>

            <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4 sm:px-6">
              <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-wider text-slate-600">
                Today · Jeanity
              </p>
              <div className="mx-auto max-w-3xl space-y-4">
                {CHAT_MESSAGES.map((m) =>
                  m.from === "them" ? (
                    <div key={m.id} className="flex gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                        {(m.author || "?").charAt(0)}
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-white/5 bg-slate-800/80 px-4 py-2.5 shadow-lg sm:max-w-[75%]">
                        <p className="text-[11px] font-medium text-sky-400/90">{m.author}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-200">{m.text}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{m.time}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-end gap-2 sm:gap-3">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-sky-500 to-emerald-600 px-4 py-2.5 text-right shadow-[0_8px_30px_rgba(14,165,233,0.25)] sm:max-w-[75%]">
                        <p className="text-sm font-medium leading-relaxed text-slate-950">{m.text}</p>
                        <p className="mt-1 text-[10px] text-slate-900/70">{m.time} · You</p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-xs font-bold text-slate-950">
                        Y
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/8 bg-[#0a0e14] p-3 sm:p-4">
              <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-[#06080c] p-2 ring-1 ring-white/5">
                <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-white/5 hover:text-sky-400" aria-label="Attach">
                  +
                </button>
                <input
                  type="text"
                  placeholder="Message on Jeanity…"
                  className="min-h-[44px] flex-1 bg-transparent px-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-4 py-2 text-sm font-bold text-slate-950"
                >
                  Send
                </button>
              </div>
            </footer>
          </section>

          {/* —— Group info (desktop) —— */}
          <aside className="hidden w-[280px] shrink-0 flex-col border-l border-white/8 bg-[#0c1018] xl:flex">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h3 className="font-semibold text-white">Group info</h3>
              <button type="button" className="text-slate-500 hover:text-white" aria-label="More">
                ⋮
              </button>
            </div>
            <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">About</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Where creators meet. Elevate your vibe on Jeanity—real-time threads and spaces.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Link</p>
                <p className="mt-1 truncate text-sm text-sky-400">jeanity.app/vibehive</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <span>🔔</span> Notifications
                </span>
                <span className="h-5 w-9 rounded-full bg-sky-500/40 ring-1 ring-sky-400/50" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Media</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 ring-1 ring-white/10" />
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-emerald-600/40 to-teal-600/40 ring-1 ring-white/10" />
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-sky-600/40 to-indigo-600/40 ring-1 ring-white/10" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Members</p>
                <ul className="mt-2 space-y-2">
                  {["Guy Hawkins", "Lead Frans", "Floyd Miles"].map((n) => (
                    <li key={n} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
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

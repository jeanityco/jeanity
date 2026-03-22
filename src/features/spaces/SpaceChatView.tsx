"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AppNavActive } from "@/components/shell/AppSidebar";
import { AppShell } from "@/components/shell/AppShell";
import { shellSpaceColumn } from "@/lib/ui/appShellClasses";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
type ChatRow = {
  id: string;
  from: "them" | "me";
  author: string;
  authorColor: string;
  when: string;
  text?: string;
  kind?: "text" | "audio" | "sticker";
  audioDuration?: string;
  reactions?: { label: string; count: number; reactedByMe?: boolean }[];
  isEdited?: boolean;
  isDeleted?: boolean;
  canEdit?: boolean;
  userId?: string | null;
};

const CHANNEL_COLORS = ["#a78bfa", "#34d399", "#f472b6", "#38bdf8", "#22d3ee", "#fbbf24", "#f97316"];

function authorColor(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return CHANNEL_COLORS[n % CHANNEL_COLORS.length];
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}


/** MVP: single channel only */
const FALLBACK_CHANNELS: { id: string; name: string; description?: string }[] = [
  { id: "general", name: "general", description: "Design, builds, and what's shipping on Jeanity" },
];

type DbChannel = { id: string; slug: string; name: string; description: string | null; sort_order: number };
type DbMessage = {
  id: string;
  channel_id: string;
  user_id: string | null;
  author_name: string;
  body: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};
type DbReaction = { message_id: string; user_id: string; emoji: string };

function aggregateReactions(reactions: DbReaction[], currentUserId: string | null): { label: string; count: number; reactedByMe?: boolean }[] {
  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const cur = byEmoji.get(r.emoji) ?? { count: 0, reactedByMe: false };
    cur.count++;
    if (currentUserId && r.user_id === currentUserId) cur.reactedByMe = true;
    byEmoji.set(r.emoji, cur);
  }
  return Array.from(byEmoji.entries()).map(([label, { count, reactedByMe }]) => ({ label, count, reactedByMe }));
}

function dbToChatRow(m: DbMessage, currentUserId: string | null, reactions: DbReaction[] = []): ChatRow {
  const isMe = currentUserId && m.user_id === currentUserId;
  const msgReactions = reactions.filter((r) => r.message_id === m.id);
  return {
    id: m.id,
    from: isMe ? "me" : "them",
    author: isMe ? "You" : m.author_name,
    authorColor: authorColor(m.author_name),
    when: formatWhen(m.created_at),
    text: m.deleted_at ? undefined : (m.body ?? undefined),
    isEdited: !!m.edited_at,
    isDeleted: !!m.deleted_at,
    canEdit: !!(isMe && !m.deleted_at),
    userId: m.user_id,
    reactions: msgReactions.length ? aggregateReactions(msgReactions, currentUserId) : undefined,
  };
}

export type SpaceSummary = {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
  created_by: string | null;
};

export function SpaceChatView({
  space = null,
  navActive = "feeds",
}: {
  space?: SpaceSummary | null;
  /** Which sidebar tab is highlighted (space chat lives at `/{code}`) */
  navActive?: AppNavActive;
} = {}) {
  const { user, name: userName, ready } = useAuthSnapshot();
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");
  const [channels, setChannels] = useState<{ id: string; name: string; description?: string }[]>(FALLBACK_CHANNELS);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [spaceRoster, setSpaceRoster] = useState<
    { userId: string; name: string; avatarUrl: string | null }[]
  >([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const activeChannel =
    channels.find((c) => c.id === activeChannelId)?.name ?? activeChannelId;
  const activeChannelDescription =
    channels.find((c) => c.id === activeChannelId)?.description ?? "";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("channels")
      .select("id, slug, name, description, sort_order")
      .eq("slug", "general")
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: DbChannel[] | null }) => {
        if (data?.length) {
          setChannels(
            (data as DbChannel[]).map((c) => ({
              id: c.slug,
              name: c.name,
              description: c.description ?? undefined,
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    if (!space?.id || !user?.id) {
      setSpaceRoster([]);
      setRosterLoading(false);
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data: memberRows, error } = await supabase
        .from("space_members")
        .select("user_id")
        .eq("space_id", space.id);
      if (cancelled) return;

      let idList: string[];
      if (error) {
        const missingTable =
          error.code === "PGRST205" ||
          (typeof error.message === "string" && error.message.includes("space_members"));
        if (missingTable && space.created_by) {
          console.warn(
            "[Jeanity] space_members failed (missing table, or RLS recursion fixed in schema §7b — re-run supabase/schema.sql). Showing space owner only."
          );
          idList = [space.created_by];
        } else {
          console.error("space_members:", error);
          setSpaceRoster([]);
          setRosterLoading(false);
          return;
        }
      } else {
        const ids = new Set<string>((memberRows ?? []).map((r: { user_id: string }) => r.user_id));
        if (space.created_by && !ids.has(space.created_by)) ids.add(space.created_by);
        idList = Array.from(ids);
      }

      if (idList.length === 0) {
        setSpaceRoster([]);
        setRosterLoading(false);
        return;
      }
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", idList);
      if (cancelled) return;
      if (pErr) {
        console.error("profiles:", pErr);
        setSpaceRoster([]);
        setRosterLoading(false);
        return;
      }
      type P = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
      const byId = new Map(
        (profs as P[] | null)?.map((p) => {
          const handle = p.username?.replace(/^@/, "").trim();
          const name =
            p.display_name?.trim() || (handle ? `@${handle}` : "") || "Member";
          return [p.id, { userId: p.id, name, avatarUrl: p.avatar_url }] as const;
        }) ?? []
      );
      const roster = idList.map((id) => byId.get(id) ?? { userId: id, name: "Member", avatarUrl: null });
      roster.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      setSpaceRoster(roster);
      setRosterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [space?.id, space?.created_by, user?.id]);

  const fetchMessages = useCallback(async (channelId: string) => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let q = supabase
      .from("messages")
      .select("id, channel_id, user_id, author_name, body, edited_at, deleted_at, created_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    if (space) q = q.eq("space_id", space.id);
    else q = q.is("space_id", null);
    const { data: msgData, error } = await q;
    if (error) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const rows = (msgData ?? []) as DbMessage[];
    const messageIds = rows.map((m) => m.id);
    let reactions: DbReaction[] = [];
    if (messageIds.length) {
      const { data: reactionData } = await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds);
      reactions = (reactionData ?? []) as DbReaction[];
    }
    setMessages(rows.map((m) => dbToChatRow(m, user?.id ?? null, reactions)));
    setLoading(false);
  }, [user?.id, space]);

  useEffect(() => {
    if (!ready) return;
    // Defer so initial `setLoading(true)` inside fetch isn’t treated as sync setState in the effect body (eslint/react-compiler).
    const tid = window.setTimeout(() => {
      void fetchMessages(activeChannelId);
    }, 0);
    return () => window.clearTimeout(tid);
  }, [activeChannelId, ready, fetchMessages]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const ch = supabase.channel("messages:" + (space?.id ?? "global") + ":" + activeChannelId);
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannelId}` },
      (payload: { new: DbMessage & { space_id?: string | null } }) => {
        const row = payload.new;
        const matchSpace = space ? row.space_id === space.id : row.space_id == null;
        if (!matchSpace) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, dbToChatRow(row, user?.id ?? null)];
        });
      }
    );
    ch.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannelId}` },
      (payload: { new: DbMessage & { space_id?: string | null } }) => {
        const row = payload.new;
        const matchSpace = space ? row.space_id === space.id : row.space_id == null;
        if (!matchSpace) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === row.id ? { ...dbToChatRow(row, user?.id ?? null), reactions: m.reactions } : m))
        );
        if (editingId === row.id) setEditingId(null);
      }
    );
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "message_reactions" },
      async (payload: { new: DbReaction }) => {
        const r = payload.new;
        const { data: msg } = await supabase.from("messages").select("channel_id, space_id").eq("id", r.message_id).single();
        if (msg?.channel_id !== activeChannelId) return;
        if (space ? msg?.space_id !== space.id : msg?.space_id != null) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== r.message_id) return m;
            const next = [...(m.reactions ?? []).map((x) => ({ ...x }))];
            const cur = next.find((x) => x.label === r.emoji);
            if (cur) {
              cur.count++;
              if (user?.id === r.user_id) cur.reactedByMe = true;
            } else next.push({ label: r.emoji, count: 1, reactedByMe: user?.id === r.user_id });
            return { ...m, reactions: next };
          })
        );
      }
    );
    ch.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "message_reactions" },
      async (payload: { old: DbReaction }) => {
        const r = payload.old;
        const { data: msg } = await supabase.from("messages").select("channel_id, space_id").eq("id", r.message_id).single();
        if (msg?.channel_id !== activeChannelId) return;
        if (space ? msg?.space_id !== space.id : msg?.space_id != null) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== r.message_id) return m;
            const next = (m.reactions ?? [])
              .map((x) =>
                x.label === r.emoji
                  ? { ...x, count: Math.max(0, x.count - 1), reactedByMe: x.reactedByMe && r.user_id !== user?.id }
                  : x
              )
              .filter((x) => x.count > 0);
            return { ...m, reactions: next.length ? next : undefined };
          })
        );
      }
    );
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeChannelId, user?.id, editingId, space]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text || !user) return;
    const supabase = getSupabaseBrowserClient();
    const authorName = userName || user.email?.split("@")[0] || "Anonymous";
    setMessageInput("");
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        channel_id: activeChannelId,
        space_id: space?.id ?? null,
        user_id: user.id,
        author_name: authorName,
        body: text,
      })
      .select("id, channel_id, user_id, author_name, body, edited_at, deleted_at, created_at")
      .single();
    if (!error && inserted) {
      const row = inserted as DbMessage;
      setMessages((prev) => [...prev, dbToChatRow(row, user.id)]);
    }
  };

  const updateMessage = async (messageId: string, newBody: string) => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const editedAt = new Date().toISOString();
    setEditingId(null);
    setEditDraft("");
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: newBody, isEdited: true } : m
      )
    );
    await supabase
      .from("messages")
      .update({ body: newBody, edited_at: editedAt, updated_at: editedAt })
      .eq("id", messageId)
      .eq("user_id", user.id);
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: undefined, isDeleted: true } : m))
    );
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), body: null, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("user_id", user.id);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const m = messages.find((x) => x.id === messageId);
    const reacted = m?.reactions?.find((r) => r.label === emoji && r.reactedByMe);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const next = [...(msg.reactions ?? [])];
        const cur = next.find((x) => x.label === emoji);
        if (reacted) {
          if (cur) {
            cur.count = Math.max(0, cur.count - 1);
            cur.reactedByMe = false;
          }
          return { ...msg, reactions: next.filter((x) => x.count > 0).length ? next : undefined };
        }
        if (cur) {
          cur.count++;
          cur.reactedByMe = true;
        } else next.push({ label: emoji, count: 1, reactedByMe: true });
        return { ...msg, reactions: next };
      })
    );
    const supabase = getSupabaseBrowserClient();
    if (reacted) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };


  const openChannel = (id: string) => {
    setActiveChannelId(id);
    setMobilePanel("chat");
  };

  return (
    <AppShell active={navActive}>
      <div className={shellSpaceColumn}>
        {/* Desktop: full-height 3 columns inside */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* —— Spaces rail + channels (Jeanity UI) —— */}
          <div
            className={`flex min-h-0 w-full shrink-0 overflow-hidden border-r border-white/5 bg-[#080c14] lg:w-[min(100%,280px)] lg:max-w-[280px] lg:min-w-0 ${
              mobilePanel === "chat" ? "hidden lg:flex" : "flex"
            }`}
          >
            <aside className="scrollbar-hide flex min-h-0 min-w-0 w-full flex-1 flex-col bg-[#0a0e1a]/95 backdrop-blur-sm">
              <div className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 pb-4 pt-3">
                <div className="mb-1">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    General
                  </p>
                  <div className="space-y-0.5">
                    {channels.map((ch) => (
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
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-sky-400"
                          aria-hidden
                        />
                        <span className="truncate">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
              <h2 className="truncate text-base font-semibold text-white">{activeChannel}</h2>
              <span className="hidden h-1 w-1 shrink-0 rounded-full bg-slate-600 sm:block" aria-hidden />
              <p className="hidden min-w-0 flex-1 truncate text-sm text-slate-500 sm:block">
                {activeChannelDescription}
              </p>
            </header>

            <div className="scrollbar-hide flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[100%] px-4 pb-6 pt-4">
                {(loading && messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>
              ) : !user && messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Sign in to view and send messages in #${activeChannel}.
                </p>
              ) : (
                messages.map((m) => (
                  <article
                    key={m.id}
                    className="group -mx-2 flex gap-4 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]"
                  >
                    <div
                      className="mt-0.5 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-slate-200 ring-1 ring-white/10"
                      aria-hidden
                    >
                      {m.author.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span className="cursor-default font-semibold" style={{ color: m.authorColor }}>
                          {m.author}
                        </span>
                        <time className="text-xs font-medium text-slate-500">{m.when}</time>
                        {m.isEdited && !m.isDeleted && (
                          <span className="text-xs text-slate-500">(edited)</span>
                        )}
                        {m.canEdit && editingId !== m.id && (
                          <span className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-sky-300"
                              onClick={() => {
                                setEditingId(m.id);
                                setEditDraft(m.text ?? "");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-red-400"
                              onClick={() => deleteMessage(m.id)}
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </div>
                      {editingId === m.id ? (
                        <div className="mt-1 flex flex-col gap-2">
                          <input
                            className="min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[15px] text-slate-200 focus:border-sky-500/50 focus:outline-none"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/30"
                              onClick={() => updateMessage(m.id, editDraft.trim())}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/10"
                              onClick={() => { setEditingId(null); setEditDraft(""); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : m.isDeleted ? (
                        <p className="mt-0.5 italic text-sm text-slate-500">Message deleted</p>
                      ) : m.text ? (
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
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {["👍", "❤️", "😂"].map((emoji) => {
                              const r = m.reactions?.find((x) => x.label === emoji);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => user && toggleReaction(m.id, emoji)}
                                  disabled={!user}
                                  className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm transition ${
                                    r?.reactedByMe
                                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                      : "border-white/5 bg-white/5 text-slate-400 hover:border-emerald-500/30 hover:bg-white/10"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {r && r.count > 0 && (
                                    <span className="text-xs text-slate-400">{r.count}</span>
                                  )}
                                </button>
                              );
                            })}
                            {m.reactions?.filter((r) => !["👍", "❤️", "😂"].includes(r.label)).map((r) => (
                              <button
                                key={r.label}
                                type="button"
                                onClick={() => user && toggleReaction(m.id, r.label)}
                                disabled={!user}
                                className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm ${
                                  r.reactedByMe ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/5 bg-white/5"
                                }`}
                              >
                                <span>{r.label}</span>
                                <span className="text-xs text-slate-400">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </article>
                )))
              )}
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/5 bg-[#0a0e1a] px-4 pb-6 pt-3">
              <form onSubmit={sendMessage} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 ring-1 ring-emerald-500/10">
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
                  placeholder={user ? `Message #${activeChannel}` : "Sign in to send messages"}
                  className="min-h-[44px] flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={!user}
                />
                <button
                  type="submit"
                  disabled={!user || !messageInput.trim()}
                  className="hidden rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:enabled:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed sm:block"
                >
                  Send
                </button>
              </form>
            </footer>
          </section>

          {/* —— Space info + VibeHive (desktop right rail) —— */}
          <aside className="hidden w-[280px] shrink-0 flex-col border-l border-white/5 bg-[#080c14] xl:flex">
            <div className="shrink-0 border-b border-white/5 px-4 py-3">
              <h3 className="font-semibold tracking-tight text-white">Space info</h3>
            </div>
            <div
              className={`shrink-0 border-b border-white/5 px-4 pb-3 pt-3 ${space?.icon_url ? "min-h-[160px] bg-cover bg-center" : "bg-gradient-to-br from-emerald-600/25 via-[#080c14] to-sky-600/20"}`}
              style={space?.icon_url ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.65)), url(${space.icon_url})` } : undefined}
            >
              <h2 className="truncate text-[15px] font-bold tracking-tight text-white drop-shadow-md">
                {space ? space.name : "VibeHive"}
              </h2>
              {!space && (
                <p className="mt-1 text-[11px] text-slate-500">Creators · design · ship</p>
              )}
              {!space?.icon_url && (
                <div className="mt-3 flex h-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] ring-1 ring-white/5">
                  <span className="text-2xl opacity-90" aria-hidden>✦</span>
                </div>
              )}
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
                {space ? (
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const full = `${window.location.origin}/invite/${space.code}`;
                        try {
                          await navigator.clipboard.writeText(full);
                          setInviteCopied(true);
                          window.setTimeout(() => setInviteCopied(false), 2000);
                        } catch {
                          /* clipboard denied or unavailable */
                        }
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-sky-400 transition hover:bg-white/10 hover:text-sky-300"
                      aria-label={inviteCopied ? "Copied" : "Copy invite link"}
                      title={inviteCopied ? "Copied" : "Copy invite link"}
                    >
                      {inviteCopied ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-sky-400">
                      jeanity.com/invite/{space.code}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 truncate text-sm font-medium text-sky-400">jeanity.com/feeds</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Members</p>
                {!space ? (
                  <p className="mt-2 text-xs text-slate-500">Join a space to see members.</p>
                ) : rosterLoading ? (
                  <p className="mt-2 text-xs text-slate-500">Loading members…</p>
                ) : spaceRoster.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No members yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {spaceRoster.map((m) => (
                      <li
                        key={m.userId}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]"
                      >
                        {m.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/40 to-emerald-600/40 text-xs font-bold text-white ring-1 ring-white/10">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{m.name}</p>
                          <p className="text-[10px] text-slate-500">On Jeanity</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link
                href="/feeds"
                prefetch={false}
                className="block rounded-xl border border-emerald-500/25 py-2.5 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
              >
                Back to Feeds
              </Link>
            </div>
          </aside>
        </div>
      </div>

    </AppShell>
  );
}

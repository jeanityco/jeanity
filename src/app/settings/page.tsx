"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedsCurrentUserHeader } from "@/app/feeds/FeedsCurrentUser";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
} from "@/components/AppSidebar";
import { HeaderAccountMenu } from "@/components/HeaderAccountMenu";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

export default function SettingsPage() {
  const { user, ready } = useAuthSnapshot();
  const m = user?.user_metadata ?? {};

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* No page scroll / wheel scroll on Settings (restore when leaving) */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const n = m.name ?? m.full_name;
    setName(typeof n === "string" ? n : user.email?.split("@")[0] ?? "");
    setBio(typeof m.bio === "string" ? m.bio : "");
    const av = typeof m.avatar === "string" ? m.avatar : "";
    setAvatar(
      av.startsWith("data:") || av.startsWith("http://") || av.startsWith("https://")
        ? av
        : ""
    );
  }, [user, m.name, m.full_name, m.bio, m.avatar]);

  const reloadSession = useCallback(() => {
    window.location.reload();
  }, []);

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 400 * 1024) {
      setErr("Image must be under 400 KB.");
      return;
    }
    setErr("");
    const r = new FileReader();
    r.onload = () => setAvatar(String(r.result).slice(0, 50000));
    r.readAsDataURL(file);
  };

  const saveAll = async () => {
    if (!user) return;
    setErr("");
    setMsg("");
    if (password.length > 0 || passwordConfirm.length > 0) {
      if (password.length < 6) {
        setErr("Password must be at least 6 characters.");
        return;
      }
      if (password !== passwordConfirm) {
        setErr("Passwords do not match.");
        return;
      }
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload: {
        password?: string;
        data: Record<string, unknown>;
      } = {
        data: {
          name: name.trim(),
          full_name: name.trim(),
          bio: bio.trim(),
          avatar:
            avatar.trim() ||
            (typeof m.avatar === "string" ? m.avatar : null) ||
            null,
        },
      };
      if (password.length > 0) {
        payload.password = password;
      }
      const { error } = await supabase.auth.updateUser(payload);
      if (error) throw error;
      const parts: string[] = ["Saved."];
      if (payload.password) {
        parts.push("Password updated.");
        setPassword("");
        setPasswordConfirm("");
      }
      setMsg(parts.join(" "));
      setTimeout(reloadSession, 800);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-dvh max-h-dvh overflow-hidden bg-[#0a0e1a] text-white antialiased lg:flex lg:min-h-0">
      <AppBackground />
      <AppSidebar active="feeds" />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-28 pt-3 sm:pt-4 lg:pb-24 lg:pt-0">
        <header className="z-10 shrink-0 border-b border-white/5 bg-[#0a0e1a]/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <button
                type="button"
                aria-label="Menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 lg:hidden"
              >
                <span className="flex flex-col gap-1">
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                </span>
              </button>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl">
                  Settings
                </h1>
                <p className="hidden text-xs text-slate-500 sm:block lg:text-sm">
                  Profile, avatar, bio, and password
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:flex-initial lg:gap-4">
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </div>
          </div>
        </header>

        {/* Same width + horizontal padding as Search: mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 */}
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!ready ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !user ? (
            <p className="text-sm text-slate-400">
              Sign in to edit your account.{" "}
              <Link href="/" className="text-sky-400 hover:underline">
                Home
              </Link>
            </p>
          ) : (
            <form
              className="min-w-0 w-full max-w-none rounded-2xl border border-white/8 bg-white/[0.03] p-4 ring-1 ring-white/5 sm:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void saveAll();
              }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Left: avatar first */}
                <div className="flex shrink-0 flex-col items-start border-b border-white/5 pb-4 sm:w-[8.5rem] sm:border-b-0 sm:border-r sm:pr-6 sm:pb-0">
                  <Field id="avatar" label="Avatar">
                    <div className="flex flex-col items-start gap-3">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={onAvatarFile}
                      />
                      {/* Same size as profile page; click to change photo */}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-4 border-[#0a0e1a] bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-3xl shadow-xl ring-2 ring-emerald-400/30 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-28 sm:w-28"
                        aria-label="Change avatar image"
                      >
                        {avatar.startsWith("data:") || avatar.startsWith("http") ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : typeof m.avatar === "string" &&
                          !m.avatar.startsWith("data:") &&
                          !m.avatar.startsWith("http") ? (
                          <span>{m.avatar}</span>
                        ) : (
                          <span className="text-2xl font-bold text-slate-950">?</span>
                        )}
                      </button>
                    </div>
                  </Field>
                </div>

                {/* Right: name, bio, passwords, save */}
                <div className="min-w-0 flex-1 space-y-3 text-left">
                  <Field id="name" label="Name">
                    <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                  </Field>

                  <Field id="bio" label="Bio">
                    <textarea
                      id="bio"
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="About you…"
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <Field id="password" label="New password" hint="Leave blank to keep current password.">
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field id="password2" label="Confirm new password">
                    <input
                      id="password2"
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  {err && <p className="text-sm text-rose-400">{err}</p>}
                  {msg && <p className="text-sm text-emerald-400">{msg}</p>}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 py-2.5 text-sm font-bold text-slate-950 shadow-[0_8px_24px_rgba(16,185,129,0.25)] hover:brightness-110 disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <AppMobileNav active="feeds" />
      </div>
    </main>
  );
}

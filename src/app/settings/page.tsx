"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedsCurrentUserHeader } from "@/features/feeds/FeedsCurrentUser";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { AppShell } from "@/components/shell/AppShell";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { shellSettingsColumn } from "@/lib/ui/appShellClasses";

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

  const MAX_AVATAR_PX = 256;
  const MAX_AVATAR_QUALITY = 0.88;

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setErr("");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let dw = w;
      let dh = h;
      if (w > MAX_AVATAR_PX || h > MAX_AVATAR_PX) {
        if (w >= h) {
          dw = MAX_AVATAR_PX;
          dh = Math.round((h * MAX_AVATAR_PX) / w);
        } else {
          dh = MAX_AVATAR_PX;
          dw = Math.round((w * MAX_AVATAR_PX) / h);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setErr("Could not process image.");
        return;
      }
      ctx.drawImage(img, 0, 0, dw, dh);
      const dataUrl = canvas.toDataURL("image/jpeg", MAX_AVATAR_QUALITY);
      if (dataUrl.length > 200_000) {
        setErr("Image too large after resize. Try a simpler image.");
        return;
      }
      setAvatar(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setErr("Could not load image.");
    };
    img.src = url;
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
      let avatarValue: string | null =
        avatar.trim() || (typeof m.avatar === "string" ? m.avatar : null) || null;
      if (avatarValue && avatarValue.startsWith("data:")) {
        const base64 = avatarValue.split(",")[1];
        if (!base64) {
          setErr("Invalid image data.");
          setSaving(false);
          return;
        }
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/jpeg" });
        const path = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, blob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/jpeg",
          });
        if (uploadError) {
          const msg = uploadError.message || "Upload failed.";
          setErr(
            msg.includes("Bucket not found") || msg.includes("not found")
              ? "Storage bucket 'avatars' missing. In Supabase Dashboard: Storage → New bucket → name 'avatars' → Public ON, then run supabase/schema.sql for policies."
              : msg
          );
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarValue = urlData.publicUrl;
      }
      const payload: {
        password?: string;
        data: Record<string, unknown>;
      } = {
        data: {
          name: name.trim(),
          full_name: name.trim(),
          bio: bio.trim(),
          avatar: avatarValue,
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
    <AppShell
      active="feeds"
      mainClassName="h-dvh max-h-dvh overflow-hidden bg-[#0a0e1a] text-white antialiased md:flex md:flex-row md:min-h-0"
    >
      <div className={shellSettingsColumn}>
        <AppPageHeader
          title="Settings"
          subtitle="Profile, avatar, bio, and password"
          trailing={
            <>
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </>
          }
        />

        {/* Same width + horizontal padding as Search: mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 */}
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
          {!ready ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !user ? (
            <p className="text-sm text-slate-400">
              Sign in to edit your account.{" "}
              <Link href="/" prefetch={false} className="text-sky-400 hover:underline">
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

      </div>
    </AppShell>
  );
}

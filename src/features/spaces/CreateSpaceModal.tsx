"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { prepareSpaceIconForUpload } from "@/lib/prepareSpaceIconForUpload";
import { prepareSpaceBackgroundForUpload } from "@/lib/prepareSpaceBackgroundForUpload";
import { readFileAsDataUrl } from "@/lib/readFileAsDataUrl";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { shellLaunchGradientClass } from "@/lib/ui/appShellClasses";

export function generateSpaceCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 8; i++) code += chars[bytes[i]! % chars.length];
  } else {
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export type CreateSpaceResult =
  | { ok: true; code: string; iconWarning?: string }
  | { ok: false; error: string };

export async function createSpaceInDb(
  name: string,
  iconFile: File | null,
  backgroundFile: File | null,
  isPublic: boolean
): Promise<CreateSpaceResult> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a space." };

  let code = generateSpaceCode();
  let space: { id: string; code: string } | null = null;
  const trimmedName = name.trim();
  for (let attempt = 0; attempt < 3; attempt++) {
    let data: { id: string; code?: string | null } | null = null;
    let error: { code?: string; message?: string } | null = null;

    // Primary path for latest schema.
    const primary = await supabase
      .from("spaces")
      .insert({ code, name: trimmedName, created_by: user.id, is_public: isPublic })
      .select("id")
      .single();
    data = primary.data as { id: string; code?: string | null } | null;
    error = primary.error as { code?: string; message?: string } | null;

    // Fallback for older schema where `is_public` may not exist.
    if (error && /is_public/i.test(error.message ?? "")) {
      const fallback = await supabase
        .from("spaces")
        .insert({ code, name: trimmedName, created_by: user.id })
        .select("id")
        .single();
      data = fallback.data as { id: string; code?: string | null } | null;
      error = fallback.error as { code?: string; message?: string } | null;
    }

    if (!error) {
      space = { id: data!.id, code };
      break;
    }
    if (error.code === "23505") code = generateSpaceCode();
    else {
      return { ok: false, error: error.message || "Could not create space." };
    }
  }
  if (!space) return { ok: false, error: "Could not create space. Try again." };

  const { error: memberErr } = await supabase.from("space_members").insert({
    space_id: space.id,
    user_id: user.id,
  });
  if (memberErr) {
    console.error("space_members insert:", memberErr);
  }

  let iconWarning: string | undefined;
  if (iconFile) {
    let uploadFile: File = iconFile;
    let objectPath: string;
    let contentType: string | undefined;
    try {
      uploadFile = await prepareSpaceIconForUpload(iconFile);
      objectPath = `${user.id}/${space.id}.jpg`;
      contentType = "image/jpeg";
    } catch (e) {
      console.warn("space icon normalize (using original file):", e);
      const ext = (iconFile.name.includes(".") ? iconFile.name.split(".").pop() : null) || "jpg";
      const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : "jpg";
      objectPath = `${user.id}/${space.id}.${safeExt}`;
      contentType = iconFile.type || undefined;
    }
    const { error: upErr } = await supabase.storage.from("space_icons").upload(objectPath, uploadFile, {
      upsert: true,
      contentType,
    });
    if (upErr) {
      console.error("space_icons upload:", upErr);
      iconWarning = upErr.message;
    } else {
      const { data: urlData } = supabase.storage.from("space_icons").getPublicUrl(objectPath);
      const { data: updated, error: iconUpdErr } = await supabase
        .from("spaces")
        .update({ icon_url: urlData.publicUrl })
        .eq("id", space.id)
        .select("icon_url")
        .maybeSingle();
      if (iconUpdErr) {
        console.error("spaces icon_url update:", iconUpdErr);
        iconWarning = iconUpdErr.message;
      } else if (!updated?.icon_url) {
        iconWarning =
          "Icon uploaded but icon_url was not saved (add spaces.icon_url column or fix RLS update on spaces).";
      }
    }
  }

  if (backgroundFile) {
    let uploadFile: File = backgroundFile;
    let objectPath: string;
    let contentType: string | undefined;
    try {
      uploadFile = await prepareSpaceBackgroundForUpload(backgroundFile);
      objectPath = `${user.id}/${space.id}.jpg`;
      contentType = "image/jpeg";
    } catch (e) {
      console.warn("space background normalize (using original file):", e);
      const ext =
        (backgroundFile.name.includes(".") ? backgroundFile.name.split(".").pop() : null) || "jpg";
      const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : "jpg";
      objectPath = `${user.id}/${space.id}.${safeExt}`;
      contentType = backgroundFile.type || undefined;
    }
    const { error: upErr } = await supabase.storage
      .from("space_backgrounds")
      .upload(objectPath, uploadFile, {
        upsert: true,
        contentType,
      });
    if (upErr) {
      console.error("space_backgrounds upload:", upErr);
      // Non-fatal: keep space creation successful even if background fails.
    } else {
      const { data: urlData } = supabase.storage.from("space_backgrounds").getPublicUrl(objectPath);
      const { data: updated, error: bgUpdErr } = await supabase
        .from("spaces")
        .update({ background_url: urlData.publicUrl })
        .eq("id", space.id)
        .select("background_url")
        .maybeSingle();
      if (bgUpdErr) {
        console.error("spaces background_url update:", bgUpdErr);
      } else if (!updated?.background_url) {
        console.warn(
          "Background uploaded but background_url was not saved (add spaces.background_url column or fix RLS update on spaces).",
        );
      }
    }
  }

  return { ok: true, code: space.code, ...(iconWarning ? { iconWarning } : {}) };
}

type CreateSpaceModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateSpaceModal({ open, onClose }: CreateSpaceModalProps) {
  const [name, setName] = useState("");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setName("");
      setIconPreview(null);
      setIconFile(null);
      setBgPreview(null);
      setBgFile(null);
      setIsPublic(false);
      setFormError(null);
      setCreating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (bgFileInputRef.current) bgFileInputRef.current.value = "";
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, creating]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setIconFile(file);
    void readFileAsDataUrl(file).then(setIconPreview);
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setBgFile(file);
    void readFileAsDataUrl(file).then(setBgPreview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setFormError(null);
    setCreating(true);
    const result = await createSpaceInDb(trimmed, iconFile, bgFile, isPublic);
    setCreating(false);
    if (result.ok) {
      if (result.iconWarning && iconFile) {
        setFormError(
          `Space was created, but the icon was not saved: ${result.iconWarning}. Open it from the sidebar (/${result.code}).`,
        );
        return;
      }
      window.location.href = `/${result.code}`;
      onClose();
      return;
    }
    setFormError(result.error);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!creating) onClose();
      }}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1419] shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.06]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-space-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={creating}
          className="absolute right-4 top-4 z-10 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-8 sm:p-8">
          <h2 id="create-space-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Create a space
          </h2>
          <p className="mt-1 text-sm text-slate-400">Add a space to your collection</p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Background picture</p>
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ring-1 ring-white/[0.06] transition hover:border-white/20"
              >
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgFileChange}
                />
                <div className="relative aspect-[16/7] w-full">
                  {bgPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bgPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(56,189,248,0.18)_0%,rgba(16,185,129,0.12)_38%,rgba(15,20,25,0.9)_100%)]" />
                  )}
                  <div className="absolute inset-0 bg-black/25 opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur-sm transition group-hover:bg-black/45">
                      {bgPreview ? "Change background" : "Upload background"}
                    </span>
                  </div>
                </div>
              </button>
              <p className="text-xs text-slate-500">
                Optional. A wide image looks best (it will be resized and compressed).
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-28 w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.04] text-slate-400 transition hover:border-sky-500/40 hover:bg-white/[0.07] hover:text-sky-300 sm:h-32 sm:w-32"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {iconPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={iconPreview} alt="" className="h-full w-full rounded-[10px] object-cover" />
                ) : (
                  <>
                    <svg
                      className="h-9 w-9 opacity-80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.25}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z"
                      />
                    </svg>
                    <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Upload
                    </span>
                  </>
                )}
                <span
                  className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-md ring-2 ring-[#0f1419]"
                  aria-hidden
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
              </button>
            </div>

            <div>
              <label htmlFor="create-space-name" className="block text-sm font-semibold text-white">
                Space name
              </label>
              <input
                id="create-space-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My space"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>

            <div>
              <p className="block text-sm font-semibold text-white">Visibility</p>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isPublic
                      ? "bg-sky-500/20 text-white ring-1 ring-sky-500/40"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    !isPublic
                      ? "bg-sky-500/20 text-white ring-1 ring-sky-500/40"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  Private
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Public spaces appear in the Feeds `Spaces` tab. Private spaces are invite-only.
              </p>
            </div>

            {formError && <p className="text-center text-xs font-medium text-rose-400">{formError}</p>}

            <button
              type="submit"
              disabled={!name.trim() || creating}
              aria-busy={creating}
              className={`w-full rounded-full py-3.5 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 sm:text-base ${shellLaunchGradientClass}`}
            >
              {creating ? "Creating…" : "Create space"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import type { PostSurface } from "@/features/feeds/feedsPostTypes";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { readFileAsDataUrl } from "@/lib/readFileAsDataUrl";

const LAUNCH_CATEGORIES = [
  "Productivity",
  "Developer Tools",
  "Artificial Intelligence",
  "Task Management",
  "Education",
  "Android",
  "Design",
  "Community",
] as const;

const PostComposerOpenContext = createContext<((surface?: PostSurface) => void) | null>(
  null
);

export function usePostComposer() {
  const open = useContext(PostComposerOpenContext);
  return {
    openPost: () => open?.("Post"),
    /** Opens composer on Story tab (photo / text story picker). */
    openStory: () => open?.("Story"),
    /** Opens composer on Launch tab (product / listing). */
    openLaunch: () => open?.("Launch"),
  };
}

/**
 * Wraps the app so any child can open the post composer (feeds + sidebar Post).
 * Renders the modal portal once.
 */
export function PostComposerProvider({ children }: { children: ReactNode }) {
  const { addPost } = useFeedsPosts();
  const { name, tag, avatarEmoji, avatarUrl, user } = useAuthSnapshot();
  const TABS: PostSurface[] = ["Post", "Story", "Launch"];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [surface, setSurface] = useState<PostSurface>("Post");
  /** Story tab: pick photo vs text before composer */
  const [storyKind, setStoryKind] = useState<null | "photo" | "text">(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [launchName, setLaunchName] = useState("");
  const [launchTagline, setLaunchTagline] = useState("");
  const [launchCategories, setLaunchCategories] = useState<string[]>([]);
  const [launchLogoPreview, setLaunchLogoPreview] = useState<string | null>(null);
  const launchFileRef = useRef<File | null>(null);
  const launchInputRef = useRef<HTMLInputElement>(null);

  const openModal = useCallback((initialSurface: PostSurface = "Post") => {
    setSurface(initialSurface);
    setStoryKind(null);
    setLaunchName("");
    setLaunchTagline("");
    setLaunchCategories([]);
    setLaunchLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    launchFileRef.current = null;
    setOpen(true);
  }, []);

  const setSurfaceTab = (t: PostSurface) => {
    setSurface(t);
    if (t !== "Story") setStoryKind(null);
  };

  const revokePreview = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    fileRef.current = null;
  };

  const resetComposer = () => {
    setText("");
    revokePreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLaunchName("");
    setLaunchTagline("");
    setLaunchCategories([]);
    if (launchLogoPreview) URL.revokeObjectURL(launchLogoPreview);
    setLaunchLogoPreview(null);
    launchFileRef.current = null;
    if (launchInputRef.current) launchInputRef.current.value = "";
  };

  const closeModal = () => {
    resetComposer();
    setStoryKind(null);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    revokePreview();
    fileRef.current = file;
    setImagePreview(URL.createObjectURL(file));
  };

  const onPickLaunchLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (launchLogoPreview) URL.revokeObjectURL(launchLogoPreview);
    launchFileRef.current = file;
    setLaunchLogoPreview(URL.createObjectURL(file));
  };

  const toggleLaunchCategory = (c: string) => {
    setLaunchCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const canPost =
    surface === "Launch"
      ? launchName.trim().length > 0 &&
        launchCategories.length > 0 &&
        !!launchLogoPreview
      : surface === "Story" && storyKind === "photo"
        ? !!imagePreview || text.trim().length > 0
        : surface === "Story" && storyKind === "text"
          ? text.trim().length > 0
          : text.trim().length > 0 || !!imagePreview;

  const submitPost = async () => {
    if (!canPost) return;
    const authorName = user ? name : "Guest";
    const authorTag = tag.replace(/^@/, "") || "guest";

    if (surface === "Launch") {
      let launchLogoDataUrl: string | null = null;
      if (launchFileRef.current) {
        try {
          launchLogoDataUrl = await readFileAsDataUrl(launchFileRef.current);
        } catch {
          launchLogoDataUrl = launchLogoPreview;
        }
      }
      await addPost({
        authorName,
        authorTag,
        avatarUrl: null,
        avatarEmoji: avatarEmoji ?? null,
        caption: launchTagline.trim() || " ",
        imageDataUrl: null,
        surface: "Launch",
        launchName: launchName.trim(),
        launchCategories: [...launchCategories],
        launchLogoDataUrl,
      });
      closeModal();
      return;
    }

    let imageDataUrl: string | null = null;
    if (fileRef.current) {
      try {
        imageDataUrl = await readFileAsDataUrl(fileRef.current);
      } catch {
        imageDataUrl = imagePreview;
      }
    }

    await addPost({
      authorName,
      authorTag,
      avatarUrl: null,
      avatarEmoji: avatarEmoji ?? null,
      caption: text.trim() || " ",
      imageDataUrl,
      surface,
    });
    closeModal();
  };

  const modal =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center sm:p-6"
        style={{ isolation: "isolate" }}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(2, 6, 23, 0.88)",
            backgroundImage:
              "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(16, 185, 129, 0.14), transparent), radial-gradient(ellipse 55% 45% at 100% 100%, rgba(56, 189, 248, 0.12), transparent)",
          }}
          onClick={closeModal}
        />
        <div
          className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-950/95 shadow-[0_24px_80px_rgba(15,23,42,0.9),0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-sky-500/15 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-composer-label"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="h-1 w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 opacity-90"
            aria-hidden
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPickImage}
          />
          <input
            ref={launchInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPickLaunchLogo}
          />
          <nav
            className="flex w-full items-center gap-1 border-b border-white/5 px-3 py-2.5 sm:px-4"
            aria-label="Post destination"
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSurfaceTab(t)}
                className={`flex flex-1 justify-center rounded-full py-2.5 text-center text-[11px] font-semibold transition sm:text-xs ${
                  surface === t
                    ? "bg-[#1e3a5f]/90 text-white shadow-[0_0_20px_rgba(56,189,248,0.1)] ring-1 ring-sky-500/30"
                    : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {surface === "Launch" && (
            <div className="space-y-4 border-b border-white/5 p-4 sm:p-5">
              <p className="text-sm font-medium text-slate-300">Launch a product</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <button
                  type="button"
                  onClick={() => launchInputRef.current?.click()}
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-emerald-500/35 bg-white/[0.04] ring-1 ring-white/8 transition hover:border-sky-500/45 hover:bg-sky-500/10 sm:h-28 sm:w-28"
                >
                  {launchLogoPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={launchLogoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 px-2 text-center text-[10px] font-medium text-slate-500">
                      <svg className="h-8 w-8 text-sky-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Logo
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Product name</label>
                    <input
                      type="text"
                      value={launchName}
                      onChange={(e) => setLaunchName(e.target.value)}
                      placeholder="e.g. Agent 37"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Tagline</label>
                    <input
                      type="text"
                      value={launchTagline}
                      onChange={(e) => setLaunchTagline(e.target.value)}
                      placeholder="Short description or pricing…"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Categories (pick at least one)</p>
                <div className="flex flex-wrap gap-2">
                  {LAUNCH_CATEGORIES.map((c) => {
                    const on = launchCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleLaunchCategory(c)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          on
                            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/25"
                            : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-300"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end border-t border-sky-500/15 pt-4">
                <button
                  type="button"
                  disabled={!canPost}
                  onClick={() => void submitPost()}
                  className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-8 py-2.5 text-sm font-bold text-slate-950 shadow-[0_12px_28px_rgba(56,189,248,0.35)] transition hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Launch
                </button>
              </div>
            </div>
          )}

          {surface === "Story" && storyKind === null && (
            <div className="border-b border-white/5 p-4 sm:p-5">
              <p className="mb-3 text-center text-xs font-medium text-slate-500 sm:text-sm">
                Choose how you want to share your story
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStoryKind("photo");
                    setTimeout(() => fileInputRef.current?.click(), 0);
                  }}
                  className="group flex min-h-[148px] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-800 p-4 text-center shadow-[0_16px_40px_rgba(56,189,248,0.2)] ring-1 ring-sky-400/25 transition hover:brightness-110 hover:ring-sky-400/40 sm:min-h-[168px]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-white/30">
                    <svg className="h-7 w-7 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25z" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold leading-tight text-white drop-shadow-sm sm:text-base">
                    Create a Photo Story
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStoryKind("text")}
                  className="group flex min-h-[148px] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-800 p-4 text-center shadow-[0_16px_40px_rgba(192,132,252,0.18)] ring-1 ring-fuchsia-400/25 transition hover:brightness-110 hover:ring-fuchsia-400/40 sm:min-h-[168px]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-white/30">
                    <span className="text-lg font-bold tracking-tight text-slate-800">Aa</span>
                  </span>
                  <span className="text-sm font-semibold leading-tight text-white drop-shadow-sm sm:text-base">
                    Create a Text Story
                  </span>
                </button>
              </div>
            </div>
          )}

          {surface !== "Launch" && (surface !== "Story" || storyKind !== null) && (
          <div className="flex gap-3 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-lg leading-none ring-2 ring-emerald-400/40 sm:h-12 sm:w-12">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : avatarEmoji ? (
                <span className="text-xl">{avatarEmoji}</span>
              ) : (
                <span className="text-sm font-bold text-slate-950">
                  {(name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              {surface === "Story" && storyKind !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setStoryKind(null);
                    revokePreview();
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mb-2 text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  ← Change story type
                </button>
              )}
              <label id="post-composer-label" className="sr-only">
                Post text
              </label>
              <textarea
                autoFocus={surface !== "Story" || storyKind === "text"}
                rows={surface === "Story" && storyKind === "photo" && !imagePreview ? 2 : 4}
                placeholder={
                  surface === "Story" && storyKind === "text"
                    ? "Write your story…"
                    : surface === "Story" && storyKind === "photo"
                      ? "Caption (optional)…"
                      : "What's happening?"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full resize-none border-0 bg-transparent text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0 sm:text-lg"
              />

              {surface === "Story" && storyKind === "photo" && !imagePreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/35 bg-emerald-500/5 py-8 text-sm text-slate-400 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
                >
                  <svg className="h-10 w-10 text-sky-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Tap to add photo
                </button>
              )}

              {imagePreview && (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-sky-500/20 ring-1 ring-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    className="max-h-56 w-full object-cover sm:max-h-72"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => {
                      revokePreview();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90 text-slate-200 ring-1 ring-white/20 hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div
                className={`mt-4 flex flex-wrap items-center gap-3 border-t border-sky-500/15 pt-4 ${
                  surface === "Story" && storyKind === "text" ? "justify-end" : "justify-between"
                }`}
              >
                {!(surface === "Story" && storyKind === "text") && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25z" />
                  </svg>
                  Photo
                </button>
                )}
                <button
                  type="button"
                  disabled={!canPost}
                  onClick={() => void submitPost()}
                  className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-6 py-2 text-sm font-bold text-slate-950 shadow-[0_12px_28px_rgba(56,189,248,0.35)] transition hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:bg-none disabled:from-transparent disabled:via-transparent disabled:to-transparent disabled:text-slate-500 disabled:shadow-none"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <PostComposerOpenContext.Provider value={openModal}>
      {children}
      {modal}
    </PostComposerOpenContext.Provider>
  );
}


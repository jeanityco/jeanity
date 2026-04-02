"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeAppPathRedirect } from "@/lib/auth/safeRedirect";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

/** Sign-up “avatar” step: interests → auth metadata + `public.profiles.interest_categories`. */
const SIGNUP_CATEGORY_OPTIONS = [
  "SaaS",
  "AI",
  "Fintech",
  "Developer tools",
  "Design",
  "Productivity",
  "Community",
  "Gaming",
  "Music",
  "Health & fitness",
] as const;

export default function Home() {
  const OTP_COOLDOWN_KEY = "jeanity_otp_cooldown_until";
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [dobMonth, setDobMonth] = useState<string>("");
  const [dobDay, setDobDay] = useState<string>("");
  const [dobYear, setDobYear] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState<
    "details" | "verification" | "password" | "avatar" | "username"
  >("details");
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createPasswordError, setCreatePasswordError] = useState<string | null>(
    null
  );
  const [avatarChoice, setAvatarChoice] = useState<string | null>(null);
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [username, setUsername] = useState<string>("");
  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const MAX_AVATAR_PX = 256;
  const MAX_AVATAR_QUALITY = 0.88;

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarUploadError(null);
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
        setAvatarUploadError("Could not process image.");
        return;
      }
      ctx.drawImage(img, 0, 0, dw, dh);
      const dataUrl = canvas.toDataURL("image/jpeg", MAX_AVATAR_QUALITY);
      if (dataUrl.length > 200_000) {
        setAvatarUploadError("Image too large after resize. Try a simpler image.");
        return;
      }
      setAvatarChoice(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setAvatarUploadError("Could not load image.");
    };
    img.src = url;
    // Allow re-selecting the same file later (onChange won't fire otherwise).
    e.target.value = "";
  };

  const uploadAvatarIfNeeded = async (
    userId: string,
    avatar: string | null
  ): Promise<string | null> => {
    if (!avatar) return null;
    if (!avatar.startsWith("data:image")) return avatar;
    const base64 = avatar.split(",")[1];
    if (!base64) throw new Error("Invalid avatar image data.");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const supabase = getSupabaseBrowserClient();
    const path = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });
    if (uploadError) {
      const msg = uploadError.message || "Avatar upload failed.";
      throw new Error(
        msg.includes("Bucket not found") || msg.includes("not found")
          ? "Storage bucket 'avatars' missing. In Supabase Dashboard create public bucket 'avatars', then apply storage policies from schema.sql."
          : msg
      );
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  async function sendVerificationEmail() {
    if (!email.trim()) return;
    const remainingMs = otpCooldownUntil - Date.now();
    if (remainingMs > 0) {
      const seconds = Math.ceil(remainingMs / 1000);
      setVerificationError(`Too many attempts. Please wait ${seconds}s and try again.`);
      return;
    }
    setIsSendingVerification(true);
    setVerificationError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 429) {
          const cooldownMs = 5 * 60_000;
          const until = Date.now() + cooldownMs;
          setOtpCooldownUntil(until);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(OTP_COOLDOWN_KEY, String(until));
          }
          setVerificationError("Too many verification requests. Please wait a few minutes before resending.");
          setVerificationSent(false);
          return;
        }
        setVerificationError(error.message);
        setVerificationSent(false);
        return;
      }
      const until = Date.now() + 30_000;
      setOtpCooldownUntil(until);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OTP_COOLDOWN_KEY, String(until));
      }
      setVerificationSent(true);
    } finally {
      setIsSendingVerification(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(OTP_COOLDOWN_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(OTP_COOLDOWN_KEY);
      return;
    }
    setOtpCooldownUntil(parsed);
  }, []);

  useEffect(() => {
    if (otpCooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [otpCooldownUntil]);

  useEffect(() => {
    if (otpCooldownUntil > Date.now()) return;
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(OTP_COOLDOWN_KEY);
  }, [otpCooldownUntil, nowTs]);

  useEffect(() => {
    if (
      showCreateModal &&
      createStep === "verification" &&
      email.trim() &&
      !verificationSent &&
      !isSendingVerification
    ) {
      void sendVerificationEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-send when opening verification step
  }, [showCreateModal, createStep]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("signup") === "1") setShowCreateModal(true);
  }, []);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(current - i));
  }, []);

  const dayOptions = useMemo(() => {
    const monthNumber = dobMonth ? Number(dobMonth) : 0;
    const yearNumber = dobYear ? Number(dobYear) : new Date().getFullYear();
    const days =
      monthNumber > 0 ? getDaysInMonth(monthNumber, yearNumber) : 31;
    return Array.from({ length: days }, (_, i) => String(i + 1));
  }, [dobMonth, dobYear]);
  const otpCooldownSeconds = Math.max(0, Math.ceil((otpCooldownUntil - nowTs) / 1000));

  return (
    <>
      <main className="relative flex min-h-dvh min-h-[100svh] w-full flex-col overflow-x-hidden bg-[#050505] text-slate-50 antialiased">
        {/* Full-page ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-[15%] top-[-20%] h-[min(90vh,720px)] w-[min(90vw,720px)] rounded-full bg-teal-500/[0.12] blur-[100px]" />
          <div className="absolute -right-[10%] bottom-[-25%] h-[min(85vh,640px)] w-[min(85vw,640px)] rounded-full bg-sky-600/[0.14] blur-[110px]" />
          <div className="absolute left-1/2 top-1/3 h-[50vh] w-[80vw] max-w-4xl -translate-x-1/2 rounded-full bg-emerald-400/[0.06] blur-[90px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,255,255,0.07),transparent_55%)]" />
        </div>

        {/* Glass surface — fills viewport */}
        <div className="relative z-[1] flex min-h-dvh min-h-[100svh] flex-1 flex-col border-y border-white/[0.07] bg-gradient-to-b from-white/[0.06] via-[#0a0a0c]/75 to-[#050505]/90 backdrop-blur-[32px] sm:border-x sm:border-white/[0.06] md:m-3 md:min-h-[calc(100dvh-1.5rem)] md:rounded-[2rem] md:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_rgba(0,0,0,0.65)]">
          <div className="flex flex-1 flex-col justify-center px-4 py-8 pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:px-8 sm:py-12 md:px-14 md:py-14 lg:px-20 lg:py-16 xl:px-24">
            <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-14 lg:gap-16 xl:gap-20">
              {/* Card stack */}
              <div className="flex justify-center md:justify-start">
                <div className="animate-hero-cards relative h-[min(52vw,280px)] w-[min(42vw,200px)] sm:h-80 sm:w-56 md:h-96 md:w-64 lg:h-[22rem] lg:w-72">
                  {/* Back — deep cyan / navy tilt */}
                  <div
                    className="absolute left-6 top-10 h-[85%] w-[78%] rounded-[1.35rem] bg-gradient-to-b from-cyan-500/90 via-teal-600 to-slate-900 opacity-80 shadow-[0_0_60px_rgba(34,211,238,0.25),0_24px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:left-8 sm:top-12 md:left-10"
                    style={{ transform: "rotate(-14deg)" }}
                  />

                  {/* Middle — glass */}
                  <div
                    className="absolute left-2 top-5 h-[85%] w-[78%] -rotate-6 rounded-[1.35rem] bg-[#0c0f14]/85 shadow-[0_24px_70px_rgba(0,0,0,0.75)] ring-1 ring-white/12 backdrop-blur-md sm:left-3 sm:top-6 md:left-4"
                  >
                    <div className="flex h-full flex-col justify-between p-4 sm:p-5">
                      <div className="space-y-2.5">
                        <div className="h-20 w-full rounded-xl bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 sm:h-24" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Space
                          </p>
                          <p className="text-[11px] font-medium text-emerald-400/90">Live now</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full bg-white/90 py-2 text-[10px] font-bold text-slate-900">
                        Follow
                      </span>
                    </div>
                  </div>

                  {/* Front — lime → cyan + coral media + lime glow */}
                  <div
                    className="absolute right-0 top-0 h-[88%] w-[82%] rotate-[7deg] rounded-[1.35rem] bg-gradient-to-b from-[#bef264] via-[#4ade80] to-[#22d3ee] p-[1px] shadow-[0_0_80px_rgba(163,230,53,0.45),0_28px_80px_rgba(0,0,0,0.45)] sm:rotate-6"
                  >
                    <div className="flex h-full flex-col justify-between rounded-[1.28rem] bg-gradient-to-b from-[#d9f99d]/95 via-[#86efac] to-[#67e8f9]/90 p-4 sm:p-5">
                      <div className="space-y-2.5">
                        <div className="h-20 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#fb923c] via-[#f97316] to-[#ec4899] shadow-inner sm:h-24" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-900/75">
                            JEANITY
                          </p>
                          <p className="text-[11px] font-semibold text-slate-800/80">Active now</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full bg-[#0a0a0a] py-2 text-[10px] font-bold tracking-wide text-white ring-1 ring-black/40">
                        Follow
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy + CTAs */}
              <div className="flex flex-col justify-center space-y-10">
                <div className="space-y-6">
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500 sm:text-sm">
                    JEANITY
                  </p>
                  <h1 className="max-w-xl text-[clamp(1.85rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight">
                    <span className="text-white">Connect Beyond </span>
                    <span className="text-slate-500">Boundaries</span>
                  </h1>
                  <p className="max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
                    Jeanity helps you discover real-time vibes, join meaningful conversations,
                    and build connections that feel close&nbsp;— even when you are worlds apart.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateStep("details");
                      setFormError(null);
                      setVerificationCode("");
                      setVerificationError(null);
                      setVerificationSent(false);
                      setInterestCategories([]);
                      setShowCreateModal(true);
                    }}
                    className="group relative inline-flex w-full items-center justify-between gap-4 overflow-hidden rounded-full bg-gradient-to-r from-[#4ade80] via-[#22c55e] to-[#0ea5e9] px-6 py-3.5 pl-8 text-left shadow-[0_16px_50px_rgba(34,197,94,0.35),0_8px_30px_rgba(14,165,233,0.2)] transition hover:shadow-[0_20px_60px_rgba(34,197,94,0.45)] sm:w-auto sm:min-w-[280px]"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-950/90">
                      Create account
                    </span>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-sm text-white shadow-inner ring-1 ring-white/10 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignInModal(true);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-white/15 bg-[#0a0a0a]/60 px-7 py-3 text-sm font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:border-white/25 hover:bg-[#121214]/80 sm:w-auto"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-[#4ade80] shadow-[0_0_14px_rgba(74,222,128,0.95)]"
                      aria-hidden
                    />
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className="absolute inset-0"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="relative z-10 w-full max-w-xl rounded-3xl bg-slate-950/95 border border-slate-700/60 shadow-[0_32px_120px_rgba(15,23,42,0.95)]">
            <div className="flex items-center justify-between px-6 pt-5 sm:px-8">
              <div className="w-8" />
              <div className="flex-1 text-center text-sm font-semibold tracking-[0.25em] uppercase text-slate-400">
                Jeanity
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 space-y-6">
              {createStep === "details" ? (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                      Create your account
                    </h2>
                    <p className="text-sm text-slate-400">
                      Join the Jeanity vibe. Your details stay private and help us keep your experience personal.
                    </p>
                  </div>

                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();

                      const missing: string[] = [];
                      if (!name.trim()) missing.push("name");
                      if (!email.trim()) missing.push("email");
                      if (!dobMonth || !dobDay || !dobYear)
                        missing.push("date of birth");

                      if (missing.length > 0) {
                        setFormError(
                          `Please fill your ${missing.join(", ")} before continuing.`
                        );
                        return;
                      }

                      setFormError(null);
                      setVerificationCode("");
                      setVerificationError(null);
                      setVerificationSent(false);
                      setCreateStep("verification");
                    }}
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500"
                        placeholder="How should Jeanity call you?"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-slate-200">
                        Date of birth
                      </p>
                      <p className="text-xs text-slate-400">
                        This stays private. It helps Jeanity keep your recommendations and experiences age‑appropriate.
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <select
                          className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-50 shadow-inner shadow-black/40 outline-none focus:border-emerald-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-400/60"
                          value={dobMonth}
                          onChange={(e) => setDobMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTHS.map((label, index) => (
                            <option key={label} value={index + 1}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-50 shadow-inner shadow-black/40 outline-none focus:border-emerald-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-400/60"
                          value={dobDay}
                          onChange={(e) => setDobDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {dayOptions.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-50 shadow-inner shadow-black/40 outline-none focus:border-emerald-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-400/60"
                          value={dobYear}
                          onChange={(e) => setDobYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formError && (
                        <p className="pt-2 text-xs font-medium text-rose-400">
                          {formError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !name.trim() ||
                        !email.trim() ||
                        !dobMonth ||
                        !dobDay ||
                        !dobYear
                      }
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                    >
                      Next
                    </button>
                  </form>
                </>
              ) : createStep === "verification" ? (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                      Verify your email
                    </h2>
                    <p className="text-sm text-slate-400">
                      We sent a one-time code to{" "}
                      <span className="font-medium text-slate-200">{email}</span>.
                      Enter it below before you choose a password.
                    </p>
                  </div>

                  <form
                    className="space-y-5"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const code = verificationCode.replace(/\s/g, "");
                      if (code.length < 6) {
                        setVerificationError(
                          "Enter the 6-digit code from your email."
                        );
                        return;
                      }
                      setVerificationError(null);
                      const supabase = getSupabaseBrowserClient();
                      const { error } = await supabase.auth.verifyOtp({
                        email: email.trim(),
                        token: code,
                        type: "email",
                      });
                      if (error) {
                        setVerificationError(error.message);
                        return;
                      }
                      setCreateStep("password");
                    }}
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-center text-lg tracking-[0.35em] text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500 placeholder:tracking-normal"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) =>
                          setVerificationCode(
                            e.target.value.replace(/\D/g, "").slice(0, 8)
                          )
                        }
                      />
                    </div>

                    {verificationError && (
                      <p className="text-xs font-medium text-rose-400">
                        {verificationError}
                      </p>
                    )}

                    {!verificationSent && !isSendingVerification && (
                      <p className="text-xs text-amber-400/90">
                        No code yet? Check spam or resend below.
                      </p>
                    )}
                    {isSendingVerification && (
                      <p className="text-xs text-slate-400">Sending code…</p>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        disabled={isSendingVerification || otpCooldownSeconds > 0}
                        onClick={() => void sendVerificationEmail()}
                        className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                      >
                        {otpCooldownSeconds > 0 ? `Resend in ${otpCooldownSeconds}s` : "Resend code"}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-slate-500 hover:text-slate-300 sm:ml-auto"
                        onClick={() => {
                          setVerificationError(null);
                          setCreateStep("details");
                        }}
                      >
                        ← Back to details
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={verificationCode.replace(/\s/g, "").length < 6}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                    >
                      Verify & continue
                    </button>
                  </form>
                </>
              ) : createStep === "password" ? (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                      You&apos;ll need a password
                    </h2>
                    <p className="text-sm text-slate-400">
                      Make sure it&apos;s at least 8 characters. Choose something that feels like your Jeanity vibe.
                    </p>
                  </div>

                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (createPassword.length < 8) {
                        setCreatePasswordError(
                          "Password must be at least 8 characters long."
                        );
                        return;
                      }
                      setCreatePasswordError(null);
                      setCreateStep("avatar");
                    }}
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Password
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500"
                        placeholder="Create a secure password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-500">
                      By creating an account, you agree to the Jeanity{" "}
                      <span className="font-medium text-slate-200">Terms</span>,{" "}
                      <span className="font-medium text-slate-200">Privacy Policy</span>, and{" "}
                      <span className="font-medium text-slate-200">Cookie Policy</span>.
                    </p>

                    {createPasswordError && (
                      <p className="text-xs font-medium text-rose-400">
                        {createPasswordError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={createPassword.length < 8}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                    >
                      Next
                    </button>
                  </form>
                </>
              ) : createStep === "avatar" ? (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                      Pick a profile vibe
                    </h2>
                    <p className="text-sm text-slate-400">
                      Have a favorite selfie? Upload later. For now, choose an emoji that feels like your Jeanity.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-6 pt-2">
                    <input
                      ref={avatarFileRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onClick={(e) => {
                        // Ensure picker can emit change even for same file.
                        (e.currentTarget as HTMLInputElement).value = "";
                      }}
                      onChange={onAvatarFile}
                    />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-800/80 ring-4 ring-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
                      {avatarChoice?.startsWith("data:image") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarChoice} alt="" className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        <span className="text-4xl">{avatarChoice || "👤"}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-400 to-sky-400 text-slate-950 text-lg shadow-[0_10px_25px_rgba(34,197,94,0.7)]"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Upload image or pick an emoji. You can always change this later in your profile.
                    </p>
                    {avatarUploadError && <p className="text-xs font-medium text-rose-400">{avatarUploadError}</p>}
                  </div>

                  <form
                    className="space-y-5 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!avatarChoice) {
                        setFormError("Pick one avatar vibe to continue.");
                        return;
                      }
                      if (interestCategories.length === 0) {
                        setFormError("Choose at least one category you're interested in.");
                        return;
                      }
                      setFormError(null);
                      setCreateStep("username");
                    }}
                  >
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                        Quick picks
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {["📷", "😍", "😂", "🙂", "💜", "🌙", "🔥"].map((emoji) => {
                          const selected = avatarChoice === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setAvatarUploadError(null);
                                setAvatarChoice(selected ? null : emoji);
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
                                selected
                                  ? "border-emerald-400 bg-slate-900/80 shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                                  : "border-slate-700 bg-slate-900/40 hover:border-slate-400"
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                        Categories
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        What spaces and content do you want to see? Pick everything that fits you.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SIGNUP_CATEGORY_OPTIONS.map((cat) => {
                          const selected = interestCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setInterestCategories((prev) =>
                                  selected
                                    ? prev.filter((c) => c !== cat)
                                    : [...prev, cat]
                                );
                              }}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                selected
                                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25"
                                  : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {formError && (
                      <p className="text-xs font-medium text-rose-400">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!avatarChoice || interestCategories.length === 0}
                      className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                    >
                      Next
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                      What should we call you?
                    </h2>
                    <p className="text-sm text-slate-400">
                      Your @handle is how people find you on Jeanity. You can always tweak it later.
                    </p>
                  </div>

                  <form
                    className="space-y-5 pt-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!username.trim()) {
                        setFormError("Choose a username to continue.");
                        return;
                      }
                      if (createPassword.length < 8) {
                        setFormError("Please choose a password first.");
                        return;
                      }
                      try {
                        setFormError(null);
                        setIsCompletingSignup(true);
                        const supabase = getSupabaseBrowserClient();
                        const {
                          data: { session },
                        } = await supabase.auth.getSession();
                        if (session?.user) {
                          const avatarValue = await uploadAvatarIfNeeded(
                            session.user.id,
                            avatarChoice
                          );
                          const { error } = await supabase.auth.updateUser({
                            password: createPassword,
                            data: {
                              name,
                              username,
                              avatar: avatarValue,
                              interest_categories: interestCategories,
                            },
                          });
                          if (error) {
                            setFormError(error.message);
                            return;
                          }
                          const { error: profileErr } = await supabase
                            .from("profiles")
                            .update({
                              interest_categories: interestCategories,
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", session.user.id);
                          if (profileErr) {
                            console.error("profiles.interest_categories:", profileErr);
                          }
                        } else {
                          const avatarMetadata = avatarChoice?.startsWith("data:image")
                            ? null
                            : avatarChoice;
                          const { data: signUpData, error } =
                            await supabase.auth.signUp({
                              email,
                              password: createPassword,
                              options: {
                                data: {
                                  name,
                                  username,
                                  avatar: avatarMetadata,
                                  interest_categories: interestCategories,
                                },
                              },
                            });
                          if (error) {
                            setFormError(error.message);
                            return;
                          }
                          const signedInId = signUpData.session?.user?.id;
                          if (signedInId) {
                            if (avatarChoice?.startsWith("data:image")) {
                              const avatarValue = await uploadAvatarIfNeeded(signedInId, avatarChoice);
                              const { error: avatarErr } = await supabase.auth.updateUser({
                                data: { avatar: avatarValue },
                              });
                              if (avatarErr) {
                                console.error("auth.updateUser avatar:", avatarErr);
                              }
                            }
                            const { error: profileErr } = await supabase
                              .from("profiles")
                              .update({
                                interest_categories: interestCategories,
                                updated_at: new Date().toISOString(),
                              })
                              .eq("id", signedInId);
                            if (profileErr) {
                              console.error("profiles.interest_categories:", profileErr);
                            }
                          }
                        }
                        setShowCreateModal(false);
                        const next = safeAppPathRedirect(
                          new URLSearchParams(window.location.search).get("redirect")
                        );
                        window.location.href = next ?? "/feeds";
                      } finally {
                        setIsCompletingSignup(false);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-200">
                        Username
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                          @
                        </span>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 pl-8 pr-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500"
                          placeholder="your.vibe.handle"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Letters, numbers, and periods only.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-400">
                        Suggestions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          `${name || "jeanity"}.vibes`,
                          `${name || "jeanity"}_${new Date().getFullYear()}`,
                          `its.${(name || "jean").toLowerCase()}`,
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setUsername(suggestion.replace(/\s+/g, ""))}
                            className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs text-sky-300 hover:border-sky-400 hover:bg-slate-900/70"
                          >
                            @{suggestion.replace(/\s+/g, "")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formError && (
                      <p className="text-xs font-medium text-rose-400">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!username.trim() || isCompletingSignup}
                      className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                    >
                      {isCompletingSignup ? "Creating..." : "Next"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className="absolute inset-0"
            onClick={() => setShowSignInModal(false)}
          />

          <div className="relative z-10 w-full max-w-xl rounded-3xl bg-slate-950/95 border border-slate-700/60 shadow-[0_32px_120px_rgba(15,23,42,0.95)]">
            <div className="flex items-center justify-between px-6 pt-5 sm:px-8">
              <div className="w-8" />
              <div className="flex-1 text-center text-sm font-semibold tracking-[0.25em] uppercase text-slate-400">
                Jeanity
              </div>
              <button
                type="button"
                onClick={() => setShowSignInModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
                  Enter your password
                </h2>
                <p className="text-sm text-slate-400">
                  Welcome back to Jeanity. Use the email linked to your account to continue.
                </p>
              </div>

              <form
                className="space-y-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!signInEmail.trim() || !signInPassword.trim()) {
                    setSignInError("Please enter both email and password to log in.");
                    return;
                  }
                  setSignInError(null);
                  setIsSigningIn(true);
                  try {
                    const supabase = getSupabaseBrowserClient();
                    const { error } = await supabase.auth.signInWithPassword({
                      email: signInEmail.trim(),
                      password: signInPassword,
                    });
                    if (error) {
                      setSignInError(error.message);
                      return;
                    }
                    setShowSignInModal(false);
                    setSignInPassword("");
                    const next = safeAppPathRedirect(
                      new URLSearchParams(window.location.search).get("redirect")
                    );
                    window.location.href = next ?? "/feeds";
                  } finally {
                    setIsSigningIn(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-sky-400/60"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-sky-400/60"
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                  />
                </div>

                {signInError && (
                  <p className="text-xs font-medium text-rose-400">{signInError}</p>
                )}

                <button
                  type="submit"
                  disabled={
                    !signInEmail.trim() ||
                    !signInPassword.trim() ||
                    isSigningIn
                  }
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-700/80 px-6 py-3 text-sm font-semibold text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.8)] transition hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-400"
                >
                  {isSigningIn ? "Signing in…" : "Log in"}
                </button>

                <p className="pt-2 text-xs text-slate-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-slate-50 hover:text-slate-200"
                    onClick={() => {
                      setShowSignInModal(false);
                      setInterestCategories([]);
                      setShowCreateModal(true);
                    }}
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

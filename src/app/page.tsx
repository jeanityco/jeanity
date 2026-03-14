"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function Home() {
  const router = useRouter();
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

  async function sendVerificationEmail() {
    if (!email.trim()) return;
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
        setVerificationError(error.message);
        setVerificationSent(false);
        return;
      }
      setVerificationSent(true);
    } finally {
      setIsSendingVerification(false);
    }
  }

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

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 border border-white/5 shadow-[0_32px_100px_rgba(0,0,0,0.8)]">
        {/* background orbits */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,#4ade80_0%,transparent_60%)] opacity-40 blur-3xl" />
            <div className="absolute -bottom-32 -right-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,#38bdf8_0%,transparent_60%)] opacity-40 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),transparent_60%)] opacity-40" />
          </div>

          <div className="relative z-10 grid gap-10 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:px-12 md:py-12 lg:px-20 lg:py-16">
          {/* Card stack */}
            <div className="flex items-center justify-center md:justify-start">
              <div className="relative h-72 w-48 xs:h-80 xs:w-56 sm:h-80 sm:w-60 md:h-96 md:w-72">
              {/* back card */}
                <div className="absolute left-5 top-8 h-60 w-44 sm:left-7 sm:top-10 sm:h-64 sm:w-48 md:left-10 md:h-80 md:w-60 rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 opacity-70 blur-[1px] shadow-[0_24px_60px_rgba(15,23,42,0.8)] ring-1 ring-white/15" />

              {/* middle card */}
                <div className="absolute left-1.5 top-4 h-60 w-44 sm:left-3 sm:top-6 sm:h-64 sm:w-48 md:left-6 md:h-80 md:w-60 -rotate-6 rounded-3xl bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/15 backdrop-blur-xl">
                  <div className="flex h-full flex-col justify-between p-4 sm:p-5 md:p-6">
                    <div className="space-y-3">
                      <div className="h-24 sm:h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-700 via-slate-500 to-slate-300" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                          VibeHive
                        </p>
                        <p className="text-xs text-emerald-400">Active now</p>
                      </div>
                    </div>
                    <button className="inline-flex items-center justify-center rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-slate-200">
                      Follow
                    </button>
                  </div>
                </div>

                {/* front card */}
                <div className="absolute right-0 top-0 h-60 w-44 sm:h-64 sm:w-48 md:h-80 md:w-60 rotate-6 rounded-3xl bg-gradient-to-br from-emerald-400 via-lime-300 to-sky-300 shadow-[0_24px_80px_rgba(16,185,129,0.55)] ring-1 ring-white/40 backdrop-blur-xl">
                  <div className="flex h-full flex-col justify-between p-4 sm:p-5 md:p-6">
                    <div className="space-y-3">
                      <div className="h-24 sm:h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-400 via-red-400 to-rose-500" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-900/80">
                          Jeanity
                        </p>
                        <p className="text-xs text-slate-900/80">Active now</p>
                      </div>
                    </div>
                    <button className="inline-flex items-center justify-center rounded-full bg-slate-950/90 px-4 py-2 text-xs font-semibold text-slate-50 shadow-sm ring-1 ring-slate-900/60 transition hover:bg-black">
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content / CTA */}
            <div className="flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Jeanity
                </p>
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-slate-50">
                    Connect Beyond
                  </h1>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-slate-400">
                    Boundaries
                  </p>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-slate-300 md:text-base">
                  Jeanity helps you discover real-time vibes, join meaningful conversations,
                  and build connections that feel close&nbsp;— even when you are worlds apart.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setCreateStep("details");
                    setFormError(null);
                    setVerificationCode("");
                    setVerificationError(null);
                    setVerificationSent(false);
                    setShowCreateModal(true);
                  }}
                  className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_45px_rgba(8,47,73,0.75)] transition-transform hover:translate-y-0.5 hover:shadow-[0_26px_70px_rgba(8,47,73,0.9)]"
                >
                  <span className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900/80">
                    Create account
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 text-xs text-slate-50 ring-1 ring-slate-900/70 transition group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignInModal(true)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-500/50 bg-slate-900/40 px-6 py-2.5 text-sm font-medium text-slate-100/85 shadow-[0_10px_30px_rgba(15,23,42,0.7)] backdrop-blur-md transition hover:border-slate-200/70 hover:bg-slate-900/70"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                  Sign In
                </button>
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
                        disabled={isSendingVerification}
                        onClick={() => void sendVerificationEmail()}
                        className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                      >
                        Resend code
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
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-800/80 ring-4 ring-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
                      <span className="text-4xl">
                        {avatarChoice || "👤"}
                      </span>
                      <button
                        type="button"
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-sky-400 text-slate-950 text-lg shadow-[0_10px_25px_rgba(34,197,94,0.7)]"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      You can always change this later in your profile.
                    </p>
                  </div>

                  <form
                    className="space-y-5 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!avatarChoice) {
                        setFormError("Pick one avatar vibe to continue.");
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
                        {["📷", "😍", "😂", "🙂", "💜", "🌙", "🔥"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setAvatarChoice(emoji)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl transition ${
                              avatarChoice === emoji
                                ? "border-emerald-400 bg-slate-900/80 shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                                : "border-slate-700 bg-slate-900/40 hover:border-slate-400"
                            }`}
                          >
                            {emoji}
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
                      disabled={!avatarChoice}
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
                          const { error } = await supabase.auth.updateUser({
                            password: createPassword,
                            data: {
                              name,
                              username,
                              avatar: avatarChoice,
                            },
                          });
                          if (error) {
                            setFormError(error.message);
                            return;
                          }
                        } else {
                          const { error } = await supabase.auth.signUp({
                            email,
                            password: createPassword,
                            options: {
                              data: {
                                name,
                                username,
                                avatar: avatarChoice,
                              },
                            },
                          });
                          if (error) {
                            setFormError(error.message);
                            return;
                          }
                        }
                        setShowCreateModal(false);
                        router.push("/feeds");
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
                    router.push("/feeds");
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

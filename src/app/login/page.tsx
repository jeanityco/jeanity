"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";
import { safeAppPathRedirect } from "@/lib/auth/safeRedirect";
import { shellLaunchGradientClass } from "@/lib/ui/appShellClasses";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const afterLogin = safeAppPathRedirect(rawRedirect) ?? "/feeds";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signupHref = (() => {
    const qs = new URLSearchParams();
    qs.set("signup", "1");
    if (rawRedirect) qs.set("redirect", rawRedirect);
    return `/?${qs.toString()}`;
  })();

  return (
    <main className="relative flex min-h-dvh min-h-[100svh] w-full flex-col overflow-x-hidden bg-[#050505] text-slate-50 antialiased">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[15%] top-[-20%] h-[min(90vh,720px)] w-[min(90vw,720px)] rounded-full bg-teal-500/[0.12] blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[-25%] h-[min(85vh,640px)] w-[min(85vw,640px)] rounded-full bg-sky-600/[0.14] blur-[110px]" />
      </div>

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1419]/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">Log in</h1>
              <p className="mt-1 text-sm text-slate-400">Continue to Jeanity with your account.</p>
            </div>
            <Link
              href="/"
              prefetch={false}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
              aria-label="Back to home"
            >
              ✕
            </Link>
          </div>

          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim() || !password.trim()) {
                setError("Please enter both email and password.");
                return;
              }
              setError(null);
              setBusy(true);
              try {
                const supabase = getSupabaseBrowserClientOrNull();
                if (!supabase) {
                  setError("Supabase is not configured for this deployment yet.");
                  return;
                }
                const { error: signErr } = await supabase.auth.signInWithPassword({
                  email: email.trim(),
                  password: password,
                });
                if (signErr) {
                  setError(signErr.message);
                  return;
                }
                window.location.href = afterLogin;
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-sky-400/60"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-50 shadow-inner shadow-black/40 outline-none placeholder:text-slate-500 focus:border-sky-400/80 focus:bg-slate-900 focus:ring-2 focus:ring-sky-400/60"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={!email.trim() || !password.trim() || busy}
              className={`mt-2 w-full rounded-xl py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${shellLaunchGradientClass}`}
            >
              {busy ? "Signing in…" : "Log in"}
            </button>
            <p className="pt-1 text-center text-xs text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href={signupHref} prefetch={false} className="font-medium text-sky-400 hover:text-sky-300 hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[#050505] text-slate-400">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthSnapshot = {
  user: User | null;
  name: string;
  tag: string;
  avatarEmoji: string | null;
  /** Set when user_metadata.avatar is an image URL or data URL */
  avatarUrl: string | null;
  ready: boolean;
};

const defaultSnap: AuthSnapshot = {
  user: null,
  name: "Guest",
  tag: "@guest",
  avatarEmoji: null,
  avatarUrl: null,
  ready: false,
};

function snapshotFromUser(user: User | null): AuthSnapshot {
  if (!user) {
    return { user: null, name: "Guest", tag: "@guest", avatarEmoji: null, avatarUrl: null, ready: true };
  }
  const m = user.user_metadata || {};
  const n = m.name ?? m.full_name;
  const name =
    typeof n === "string" && n.trim()
      ? n.trim()
      : user.email?.split("@")[0]?.trim() || "Member";
  const u = m.username;
  const tag =
    typeof u === "string" && u.trim()
      ? `@${u.trim().replace(/^@/, "")}`
      : `@${user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9._]/g, "") || "member"}`;
  const av = m.avatar;
  const avStr = typeof av === "string" ? av : "";
  const isImage =
    avStr.startsWith("http://") ||
    avStr.startsWith("https://") ||
    avStr.startsWith("data:image");
  return {
    user,
    name,
    tag,
    avatarEmoji: isImage ? null : avStr || null,
    avatarUrl: isImage ? avStr : null,
    ready: true,
  };
}

const AuthContext = createContext<AuthSnapshot>(defaultSnap);

/** One auth read at a time → fewer GoTrue storage lock collisions. */
let authMutex: Promise<unknown> = Promise.resolve();

function runAuthExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = authMutex.then(fn, fn);
  authMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<AuthSnapshot>(defaultSnap);
  const mounted = useRef(true);

  const refresh = useCallback(() => {
    return runAuthExclusive(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();
        if (!mounted.current) return;
        if (error) {
          setSnap({ ...snapshotFromUser(null), ready: true });
          return;
        }
        setSnap(snapshotFromUser(data.user ?? null));
      } catch {
        if (mounted.current) setSnap({ ...snapshotFromUser(null), ready: true });
      }
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(() => snap, [snap]);
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthSnapshot(): AuthSnapshot {
  return useContext(AuthContext);
}

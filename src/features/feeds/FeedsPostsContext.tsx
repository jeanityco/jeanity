"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  FEED_POST_SELECT,
  feedPostFromDbRow,
  formatCommentTimestamp,
  timeLabelFrom,
} from "@/features/feeds/feedPostFromDb";
import type { DbFeedPost, FeedPost, PostComment, PostSurface } from "@/features/feeds/feedsPostTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";

type DbCommentRow = {
  id: string;
  author_name: string;
  author_tag: string;
  body: string;
  created_at: string;
  user_id?: string | null;
};

function rowToComment(row: DbCommentRow): PostComment {
  const tag = row.author_tag.startsWith("@") ? row.author_tag : `@${row.author_tag}`;
  return {
    id: row.id,
    authorName: row.author_name,
    authorTag: tag,
    text: row.body,
    timeLabel: timeLabelFrom(row.created_at),
    timeDetail: formatCommentTimestamp(row.created_at),
    createdAt: row.created_at,
    userId: row.user_id ?? null,
  };
}

type Ctx = {
  posts: FeedPost[];
  postsLoading: boolean;
  getPost: (id: string) => FeedPost | undefined;
  getComments: (postId: string) => PostComment[];
  loadCommentsForPost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  addPost: (p: {
    authorName: string;
    authorTag: string;
    avatarUrl: string | null;
    avatarEmoji: string | null;
    caption: string;
    imageDataUrl?: string | null;
    imageUrl?: string | null;
    surface?: PostSurface;
    launchName?: string;
    launchCategories?: string[];
    launchLogoDataUrl?: string | null;
    launchLogoUrl?: string | null;
  }) => void;
};

const FeedsPostsContext = createContext<Ctx | null>(null);

export function FeedsPostsProvider({ children }: { children: ReactNode }) {
  const { user, name, tag } = useAuthSnapshot();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    void supabase
      .from("feed_posts")
      .select(FEED_POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(100)
      .then((res: { data: unknown; error: PostgrestError | null }) => {
        if (cancelled) return;
        if (res.error) {
          setLoaded(true);
          return;
        }
        const rows = (res.data ?? []) as DbFeedPost[];
        setPosts(rows.map((r) => feedPostFromDbRow(r)));
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const bumpPostCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, p.comments + delta) } : p))
    );
  }, []);

  const appendComment = useCallback((postId: string, c: PostComment) => {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), c],
    }));
  }, []);

  const loadCommentsForPost = useCallback(async (postId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("feed_post_comments")
      .select("id, author_name, author_tag, body, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      // Missing table / RLS / network → treat as no comments (REST often returns 404 until migration is applied).
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[feeds] loadCommentsForPost failed — run supabase/migrations/20250322120000_feed_post_comments.sql if the table is missing:",
          error.message
        );
      }
      return;
    }

    const list = ((data ?? []) as DbCommentRow[]).map((row) => rowToComment(row));
    setCommentsByPost((prev) => ({ ...prev, [postId]: list }));
    setPosts((prev) => {
      if (!prev.some((p) => p.id === postId)) return prev;
      return prev.map((p) => (p.id === postId ? { ...p, comments: list.length } : p));
    });
  }, []);

  const addComment = useCallback(
    async (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const authorTag = tag.startsWith("@") ? tag : `@${tag}`;
      const nowIso = new Date().toISOString();
      const localComment: PostComment = {
        id: `local-${crypto.randomUUID()}`,
        authorName: name,
        authorTag,
        text: trimmed,
        timeLabel: "Just now",
        timeDetail: formatCommentTimestamp(nowIso),
        createdAt: nowIso,
        userId: user?.id ?? null,
      };

      const pushLocal = () => {
        appendComment(postId, localComment);
        bumpPostCommentCount(postId, 1);
      };

      if (!user?.id) {
        pushLocal();
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("feed_post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          author_name: name,
          author_tag: authorTag,
          body: trimmed,
        })
        .select("id, author_name, author_tag, body, created_at, user_id")
        .single();

      if (error || !data) {
        pushLocal();
        return;
      }

      // Refetch thread so list matches DB (avoids race with a slow initial load)
      await loadCommentsForPost(postId);
    },
    [user, name, tag, appendComment, bumpPostCommentCount, loadCommentsForPost]
  );

  const addPost = useCallback(
    async (p: {
      authorName: string;
      authorTag: string;
      avatarUrl: string | null;
      avatarEmoji: string | null;
      caption: string;
      imageDataUrl?: string | null;
      imageUrl?: string | null;
      surface?: PostSurface;
      launchName?: string;
      launchCategories?: string[];
      launchLogoDataUrl?: string | null;
      launchLogoUrl?: string | null;
    }) => {
      const isLaunch = p.surface === "Launch";
      const authorTag = p.authorTag.startsWith("@") ? p.authorTag : `@${p.authorTag}`;
      const caption = p.caption.trim() || " ";

      if (user?.id) {
        const supabase = getSupabaseBrowserClient();
        const { data: inserted, error } = await supabase
          .from("feed_posts")
          .insert({
            user_id: user.id,
            author_name: p.authorName,
            author_tag: authorTag,
            avatar_url: p.avatarUrl,
            avatar_emoji: p.avatarEmoji,
            caption,
            image_url: isLaunch ? null : (p.imageUrl ?? p.imageDataUrl ?? null),
            surface: p.surface ?? null,
            launch_name: isLaunch ? p.launchName?.trim() ?? null : null,
            launch_categories: isLaunch ? (p.launchCategories ?? []) : null,
            launch_logo_url: isLaunch ? (p.launchLogoUrl ?? p.launchLogoDataUrl ?? null) : null,
          })
          .select(FEED_POST_SELECT)
          .single();
        if (!error && inserted) {
          const row = feedPostFromDbRow(inserted as DbFeedPost);
          setPosts((prev) => [row, ...prev]);
          setCommentsByPost((prev) => ({ ...prev, [row.id]: [] }));
          return;
        }
      }

      const row: FeedPost = {
        id: crypto.randomUUID(),
        authorName: p.authorName,
        authorTag,
        avatarUrl: p.avatarUrl,
        avatarEmoji: p.avatarEmoji,
        caption,
        imageUrl: isLaunch ? null : (p.imageUrl ?? p.imageDataUrl ?? null),
        likes: 0,
        comments: 0,
        timeLabel: "Posted · Just now",
        surface: p.surface,
        launchName: isLaunch ? p.launchName?.trim() : undefined,
        launchCategories: isLaunch ? p.launchCategories : undefined,
        launchLogoUrl: isLaunch ? (p.launchLogoUrl ?? p.launchLogoDataUrl ?? null) : undefined,
      };
      setPosts((prev) => [row, ...prev]);
      setCommentsByPost((prev) => ({ ...prev, [row.id]: [] }));
    },
    [user]
  );

  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);
  const getComments = useCallback(
    (postId: string) => commentsByPost[postId] ?? [],
    [commentsByPost]
  );

  const value = useMemo(
    () => ({
      posts,
      postsLoading: !loaded,
      addPost,
      getPost,
      getComments,
      loadCommentsForPost,
      addComment,
    }),
    [posts, loaded, addPost, getPost, getComments, loadCommentsForPost, addComment]
  );

  return (
    <FeedsPostsContext.Provider value={value}>
      {children}
    </FeedsPostsContext.Provider>
  );
}

export function useFeedsPosts() {
  const ctx = useContext(FeedsPostsContext);
  if (!ctx) throw new Error("useFeedsPosts outside FeedsPostsProvider");
  return ctx;
}

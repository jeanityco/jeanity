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
import {
  FEED_POST_SELECT,
  FEED_POST_SELECT_BASE,
  feedPostFromDbRow,
  formatCommentTimestamp,
  timeLabelFrom,
} from "@/features/feeds/feedPostFromDb";
import type {
  DbFeedPost,
  DbProduct,
  FeedPost,
  FeedProduct,
  PostComment,
  PostSurface,
} from "@/features/feeds/feedPostTypes";
import { PRODUCT_SELECT, productFromDbRow } from "@/features/feeds/productFromDb";
import { fetchRankedFeedPage, type FeedRankCursor } from "@/lib/feed/rankedFeed";
import { rankFallbackFeed } from "@/lib/feed/fallbackFeedRanking";
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

/** Keep first occurrence per id (query order = newest first). */
function dedupePostsById(posts: FeedPost[]): FeedPost[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function dedupeProductsById(products: FeedProduct[]): FeedProduct[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function rowToComment(row: DbCommentRow, avatarUrl?: string | null): PostComment {
  const tag = row.author_tag.startsWith("@") ? row.author_tag : `@${row.author_tag}`;
  return {
    id: row.id,
    authorName: row.author_name,
    authorTag: tag,
    avatarUrl: avatarUrl ?? null,
    text: row.body,
    timeLabel: timeLabelFrom(row.created_at),
    timeDetail: formatCommentTimestamp(row.created_at),
    createdAt: row.created_at,
    userId: row.user_id ?? null,
  };
}

const FEED_PAGE_SIZE = 30;

type Ctx = {
  posts: FeedPost[];
  products: FeedProduct[];
  postsLoading: boolean;
  feedRankingActive: boolean;
  feedHasMore: boolean;
  feedLoadingMore: boolean;
  loadMorePosts: () => Promise<void>;
  bumpPostLikeCount: (postId: string, delta: number) => void;
  upvoteProduct: (productId: string) => Promise<void>;
  getPost: (id: string) => FeedPost | undefined;
  getProduct: (id: string) => FeedProduct | undefined;
  getComments: (postId: string) => PostComment[];
  getProductComments: (productId: string) => PostComment[];
  loadCommentsForPost: (postId: string) => Promise<void>;
  loadCommentsForProduct: (productId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  addProductComment: (productId: string, text: string) => Promise<void>;
  addPost: (p: {
    authorName: string;
    authorTag: string;
    avatarUrl: string | null;
    avatarEmoji: string | null;
    caption: string;
    imageDataUrl?: string | null;
    imageUrl?: string | null;
    surface?: PostSurface;
  }) => void;
  addProduct: (p: {
    authorName: string;
    authorTag: string;
    name: string;
    tagline: string;
    categories: string[];
    logoDataUrl: string | null;
  }) => Promise<void>;
};

const FeedsPostsContext = createContext<Ctx | null>(null);

export function FeedsPostsProvider({ children }: { children: ReactNode }) {
  const { user, name, tag, avatarUrl: myAvatarUrl } = useAuthSnapshot();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedRankingActive, setFeedRankingActive] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [rankCursor, setRankCursor] = useState<FeedRankCursor | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentsByProduct, setCommentsByProduct] = useState<Record<string, PostComment[]>>({});

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    void (async () => {
      const productsRes = await supabase
        .from("product")
        .select(PRODUCT_SELECT)
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (!productsRes.error && productsRes.data) {
        setProducts(dedupeProductsById((productsRes.data as DbProduct[]).map(productFromDbRow)));
      } else {
        setProducts([]);
        if (productsRes.error && process.env.NODE_ENV === "development") {
          console.warn(
            "[feeds] product table missing — run `supabase/schema.sql` in Supabase SQL Editor, then refresh:",
            productsRes.error.message
          );
        }
      }

      const ranked = await fetchRankedFeedPage(supabase, {
        viewerId: user?.id ?? null,
        limit: FEED_PAGE_SIZE,
      });

      if (cancelled) return;

      if (!ranked.error) {
        setFeedRankingActive(true);
        setRankCursor(ranked.nextCursor);
        setFeedHasMore(ranked.rawRows.length >= FEED_PAGE_SIZE);
        setPosts(dedupePostsById(ranked.posts.filter((r) => r.surface !== "Launch")));
        setLoaded(true);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[feeds] ranked feed RPC unavailable — falling back to chronological (apply latest schema.sql):",
          ranked.error.message
        );
      }

      let postsRes = await supabase
        .from("feed_posts")
        .select(FEED_POST_SELECT)
        .order("created_at", { ascending: false })
        .limit(100);

      if (postsRes.error && /comments_count/i.test(postsRes.error.message)) {
        postsRes = await supabase
          .from("feed_posts")
          .select(FEED_POST_SELECT_BASE)
          .order("created_at", { ascending: false })
          .limit(100);
      }

      if (cancelled) return;

      setFeedRankingActive(false);
      setFeedHasMore(false);
      setRankCursor(null);

      if (!postsRes.error && postsRes.data) {
        const rows = postsRes.data as DbFeedPost[];
        const postRows = rows.filter((r) => r.surface !== "Launch");
        const fallbackPosts = dedupePostsById(postRows.map((r) => feedPostFromDbRow(r)));
        const followsSet = new Set<string>();
        const interestsSet = new Set<string>();
        if (user?.id) {
          const [{ data: follows }, { data: me }] = await Promise.all([
            supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", user.id),
            supabase
              .from("profiles")
              .select("interest_categories")
              .eq("id", user.id)
              .maybeSingle(),
          ]);
          const followingIds = ((follows ?? []) as { following_id: string }[]).map((row) => row.following_id);
          if (followingIds.length > 0) {
            const { data: followedProfiles } = await supabase
              .from("profiles")
              .select("username")
              .in("id", followingIds);
            for (const row of (followedProfiles ?? []) as { username?: string | null }[]) {
              const username = row.username;
              if (username) followsSet.add(username.replace(/^@/, "").toLowerCase());
            }
          }
          const interestCategories =
            ((me as { interest_categories?: string[] | null } | null)?.interest_categories ?? []);
          for (const item of interestCategories) interestsSet.add(item.toLowerCase());
        }
        setPosts(rankFallbackFeed({
          posts: fallbackPosts,
          followedAuthorTags: followsSet,
          interestTags: interestsSet,
        }));
      } else if (postsRes.error && process.env.NODE_ENV === "development") {
        console.warn("[feeds] feed_posts load failed:", postsRes.error.message);
      }

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const bumpPostCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: Math.max(0, p.comments + delta) } : p))
    );
  }, []);

  const bumpPostLikeCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + delta } : p))
    );
  }, []);

  const upvoteProduct = useCallback(async (productId: string) => {
    let previousUpvotes: number | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        previousUpvotes = p.upvotes;
        return { ...p, upvotes: p.upvotes + 1 };
      })
    );

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();

    // Keep behavior explicit: only signed-in users can persist votes.
    if (!authedUser) {
      if (previousUpvotes !== null) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, upvotes: previousUpvotes as number } : p))
        );
      }
      return;
    }

    const { data: nextUpvotes, error: rpcErr } = await supabase.rpc("increment_product_upvotes", {
      p_product_id: productId,
    });

    if (rpcErr || typeof nextUpvotes !== "number") {
      if (previousUpvotes !== null) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, upvotes: previousUpvotes as number } : p))
        );
      }
      if (process.env.NODE_ENV === "development" && rpcErr) {
        console.warn("[feeds] increment_product_upvotes failed:", rpcErr.message);
      }
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, upvotes: nextUpvotes } : p))
    );
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (!feedRankingActive || !feedHasMore || feedLoadingMore || !rankCursor) return;
    const supabase = getSupabaseBrowserClient();
    setFeedLoadingMore(true);
    try {
      const ranked = await fetchRankedFeedPage(supabase, {
        viewerId: user?.id ?? null,
        limit: FEED_PAGE_SIZE,
        cursor: rankCursor,
      });
      if (ranked.error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[feeds] loadMorePosts:", ranked.error.message);
        }
        return;
      }
      if (ranked.rawRows.length === 0) {
        setFeedHasMore(false);
        return;
      }
      setPosts((prev) =>
        dedupePostsById([
          ...prev,
          ...ranked.posts.filter((r) => r.surface !== "Launch"),
        ])
      );
      setRankCursor(ranked.nextCursor);
      setFeedHasMore(ranked.rawRows.length >= FEED_PAGE_SIZE);
    } finally {
      setFeedLoadingMore(false);
    }
  }, [
    feedRankingActive,
    feedHasMore,
    feedLoadingMore,
    rankCursor,
    user?.id,
  ]);

  const bumpProductCommentCount = useCallback((productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, comments: Math.max(0, p.comments + delta) } : p))
    );
  }, []);

  const appendComment = useCallback((postId: string, c: PostComment) => {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), c],
    }));
  }, []);

  const appendProductComment = useCallback((productId: string, c: PostComment) => {
    setCommentsByProduct((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] ?? []), c],
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
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[feeds] loadCommentsForPost failed — run supabase/schema.sql in SQL Editor if the table is missing:",
          error.message
        );
      }
      return;
    }

    const rows = (data ?? []) as DbCommentRow[];
    const userIds = [
      ...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
    ];
    const avatarByUserId: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const row = p as { id: string; avatar_url: string | null };
        avatarByUserId[row.id] = row.avatar_url;
      }
    }
    const list = rows.map((row) =>
      rowToComment(row, row.user_id ? (avatarByUserId[row.user_id] ?? null) : null)
    );
    setCommentsByPost((prev) => ({ ...prev, [postId]: list }));
    setPosts((prev) => {
      if (!prev.some((p) => p.id === postId)) return prev;
      return prev.map((p) => (p.id === postId ? { ...p, comments: list.length } : p));
    });
  }, []);

  const loadCommentsForProduct = useCallback(async (productId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("product_comment")
      .select("id, author_name, author_tag, body, created_at, user_id")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) {
      setCommentsByProduct((prev) => ({ ...prev, [productId]: [] }));
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[feeds] loadCommentsForProduct failed — run supabase/schema.sql in SQL Editor if the table is missing:",
          error.message
        );
      }
      return;
    }

    const rows = (data ?? []) as DbCommentRow[];
    const userIds = [
      ...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
    ];
    const avatarByUserId: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const row = p as { id: string; avatar_url: string | null };
        avatarByUserId[row.id] = row.avatar_url;
      }
    }
    const list = rows.map((row) =>
      rowToComment(row, row.user_id ? (avatarByUserId[row.user_id] ?? null) : null)
    );
    setCommentsByProduct((prev) => ({ ...prev, [productId]: list }));
    setProducts((prev) => {
      if (!prev.some((p) => p.id === productId)) return prev;
      return prev.map((p) => (p.id === productId ? { ...p, comments: list.length } : p));
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
        avatarUrl: myAvatarUrl ?? null,
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
        if (process.env.NODE_ENV === "development" && error) {
          console.warn("[feeds] addComment failed:", error.message);
        }
        return;
      }

      await loadCommentsForPost(postId);
    },
    [user, name, tag, myAvatarUrl, appendComment, bumpPostCommentCount, loadCommentsForPost]
  );

  const addProductComment = useCallback(
    async (productId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const authorTag = tag.startsWith("@") ? tag : `@${tag}`;
      const nowIso = new Date().toISOString();
      const localComment: PostComment = {
        id: `local-${crypto.randomUUID()}`,
        authorName: name,
        authorTag,
        avatarUrl: myAvatarUrl ?? null,
        text: trimmed,
        timeLabel: "Just now",
        timeDetail: formatCommentTimestamp(nowIso),
        createdAt: nowIso,
        userId: user?.id ?? null,
      };

      const pushLocal = () => {
        appendProductComment(productId, localComment);
        bumpProductCommentCount(productId, 1);
      };

      if (!user?.id) {
        pushLocal();
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("product_comment")
        .insert({
          product_id: productId,
          user_id: user.id,
          author_name: name,
          author_tag: authorTag,
          body: trimmed,
        })
        .select("id, author_name, author_tag, body, created_at, user_id")
        .single();

      if (error || !data) {
        if (process.env.NODE_ENV === "development" && error) {
          console.warn("[feeds] addProductComment failed:", error.message);
        }
        return;
      }

      await loadCommentsForProduct(productId);
    },
    [
      user,
      name,
      tag,
      myAvatarUrl,
      appendProductComment,
      bumpProductCommentCount,
      loadCommentsForProduct,
    ]
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
    }) => {
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
            image_url: p.imageUrl ?? p.imageDataUrl ?? null,
            surface: p.surface ?? null,
            launch_name: null,
            launch_categories: null,
            launch_logo_url: null,
          })
          .select(FEED_POST_SELECT)
          .single();
        if (!error && inserted) {
          const row = feedPostFromDbRow(inserted as DbFeedPost);
          setPosts((prev) => dedupePostsById([row, ...prev]));
          setCommentsByPost((prev) => ({ ...prev, [row.id]: [] }));
          return;
        }
      }

      const row: FeedPost = {
        id: crypto.randomUUID(),
        userId: user?.id ?? null,
        authorName: p.authorName,
        authorTag,
        avatarUrl: p.avatarUrl,
        avatarEmoji: p.avatarEmoji,
        caption,
        imageUrl: p.imageUrl ?? p.imageDataUrl ?? null,
        likes: 0,
        comments: 0,
        timeLabel: "Posted · Just now",
        createdAt: new Date().toISOString(),
        postTags: [],
        surface: p.surface,
      };
      setPosts((prev) => dedupePostsById([row, ...prev]));
      setCommentsByPost((prev) => ({ ...prev, [row.id]: [] }));
    },
    [user]
  );

  const addProduct = useCallback(
    async (p: {
      authorName: string;
      authorTag: string;
      name: string;
      tagline: string;
      categories: string[];
      logoDataUrl: string | null;
    }) => {
      const authorTag = p.authorTag.startsWith("@") ? p.authorTag : `@${p.authorTag}`;
      const tagline = p.tagline.trim() || " ";

      if (user?.id) {
        const supabase = getSupabaseBrowserClient();
        const { data: inserted, error } = await supabase
          .from("product")
          .insert({
            user_id: user.id,
            author_name: p.authorName,
            author_tag: authorTag,
            name: p.name.trim(),
            tagline,
            categories: p.categories,
            logo_url: p.logoDataUrl,
          })
          .select(PRODUCT_SELECT)
          .single();
        if (!error && inserted) {
          const row = productFromDbRow(inserted as DbProduct);
          setProducts((prev) => dedupeProductsById([row, ...prev]));
          setCommentsByProduct((prev) => ({ ...prev, [row.id]: [] }));
          return;
        }
      }

      const row: FeedProduct = {
        id: crypto.randomUUID(),
        userId: user?.id ?? null,
        authorName: p.authorName,
        authorTag,
        name: p.name.trim(),
        tagline,
        categories: [...p.categories],
        logoUrl: p.logoDataUrl,
        upvotes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => dedupeProductsById([row, ...prev]));
      setCommentsByProduct((prev) => ({ ...prev, [row.id]: [] }));
    },
    [user]
  );

  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);
  const getProduct = useCallback((id: string) => products.find((p) => p.id === id), [products]);
  const getComments = useCallback(
    (postId: string) => commentsByPost[postId] ?? [],
    [commentsByPost]
  );
  const getProductComments = useCallback(
    (productId: string) => commentsByProduct[productId] ?? [],
    [commentsByProduct]
  );

  const value = useMemo(
    () => ({
      posts,
      products,
      postsLoading: !loaded,
      feedRankingActive,
      feedHasMore,
      feedLoadingMore,
      loadMorePosts,
      bumpPostLikeCount,
      upvoteProduct,
      addPost,
      addProduct,
      getPost,
      getProduct,
      getComments,
      getProductComments,
      loadCommentsForPost,
      loadCommentsForProduct,
      addComment,
      addProductComment,
    }),
    [
      posts,
      products,
      loaded,
      feedRankingActive,
      feedHasMore,
      feedLoadingMore,
      loadMorePosts,
      bumpPostLikeCount,
      upvoteProduct,
      addPost,
      addProduct,
      getPost,
      getProduct,
      getComments,
      getProductComments,
      loadCommentsForPost,
      loadCommentsForProduct,
      addComment,
      addProductComment,
    ]
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

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PostSurface = "Post" | "Story" | "Launch";

export type FeedPost = {
  id: string;
  authorName: string;
  authorTag: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  caption: string;
  imageUrl: string | null;
  likes: number;
  comments: number;
  timeLabel: string;
  /** Where the user chose to post from the composer */
  surface?: PostSurface;
  /** Launch / product listing */
  launchName?: string;
  launchCategories?: string[];
  /** Product logo (Launch); main feed image otherwise */
  launchLogoUrl?: string | null;
};

const SAMPLE_POST: FeedPost = {
  id: "sample-cameron",
  authorName: "Cameron Williamson",
  authorTag: "@cameronwilliamson",
  avatarUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
  avatarEmoji: null,
  caption: "Shareing my new 3D art work",
  imageUrl:
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900&q=80",
  likes: 232,
  comments: 32,
  timeLabel: "Posted · 8h ago",
};

type Ctx = {
  posts: FeedPost[];
  addPost: (p: {
    authorName: string;
    authorTag: string;
    avatarUrl: string | null;
    avatarEmoji: string | null;
    caption: string;
    imageDataUrl: string | null;
    surface?: PostSurface;
    launchName?: string;
    launchCategories?: string[];
    launchLogoDataUrl?: string | null;
  }) => void;
};

const FeedsPostsContext = createContext<Ctx | null>(null);

export function FeedsPostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<FeedPost[]>([SAMPLE_POST]);

  const addPost = useCallback(
    (p: {
      authorName: string;
      authorTag: string;
      avatarUrl: string | null;
      avatarEmoji: string | null;
      caption: string;
      imageDataUrl: string | null;
      surface?: PostSurface;
      launchName?: string;
      launchCategories?: string[];
      launchLogoDataUrl?: string | null;
    }) => {
      const isLaunch = p.surface === "Launch";
      const row: FeedPost = {
        id: crypto.randomUUID(),
        authorName: p.authorName,
        authorTag: p.authorTag.startsWith("@")
          ? p.authorTag
          : `@${p.authorTag}`,
        avatarUrl: p.avatarUrl,
        avatarEmoji: p.avatarEmoji,
        caption: p.caption.trim() || " ",
        imageUrl: isLaunch ? null : p.imageDataUrl,
        likes: 0,
        comments: 0,
        timeLabel: "Posted · Just now",
        surface: p.surface,
        launchName: isLaunch ? p.launchName?.trim() : undefined,
        launchCategories: isLaunch ? p.launchCategories : undefined,
        launchLogoUrl: isLaunch ? p.launchLogoDataUrl ?? null : undefined,
      };
      setPosts((prev) => [row, ...prev]);
    },
    []
  );

  const value = useMemo(() => ({ posts, addPost }), [posts, addPost]);

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

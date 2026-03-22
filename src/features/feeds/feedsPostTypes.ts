export type PostSurface = "Post" | "Story" | "Launch";

export type PostComment = {
  id: string;
  authorName: string;
  authorTag: string;
  /** From profiles.avatar_url when comment has user_id */
  avatarUrl?: string | null;
  text: string;
  /** Short relative label fallback */
  timeLabel: string;
  /** Discord-style, e.g. "Today at 11:22 PM" */
  timeDetail?: string;
  createdAt?: string;
  userId?: string | null;
};

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
  surface?: PostSurface;
  launchName?: string;
  launchCategories?: string[];
  launchLogoUrl?: string | null;
};

export type DbFeedPost = {
  id: string;
  author_name: string;
  author_tag: string;
  avatar_url: string | null;
  avatar_emoji: string | null;
  caption: string;
  image_url: string | null;
  surface: string | null;
  launch_name: string | null;
  launch_categories: string[] | null;
  launch_logo_url: string | null;
  /** Present after running migration that adds `comments_count` to `feed_posts` */
  comments_count?: number | null;
  likes_count?: number | null;
  post_tags?: string[] | null;
  is_featured?: boolean | null;
  created_at: string;
};

/** Row from `public.product` — ranking listings, not feed_posts. */
export type DbProduct = {
  id: string;
  user_id: string;
  author_name: string;
  author_tag: string;
  name: string;
  tagline: string;
  categories: string[] | null;
  logo_url: string | null;
  upvotes: number | null;
  comments_count?: number | null;
  created_at: string;
  updated_at?: string;
};

export type FeedProduct = {
  id: string;
  userId: string | null;
  authorName: string;
  authorTag: string;
  name: string;
  tagline: string;
  categories: string[];
  logoUrl: string | null;
  upvotes: number;
  comments: number;
  createdAt: string;
};

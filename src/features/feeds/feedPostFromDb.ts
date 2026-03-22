import type { DbFeedPost, FeedPost, PostSurface } from "./feedsPostTypes";

export function timeLabelFrom(createdAt: string): string {
  const d = new Date(createdAt);
  const diffMs = Date.now() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return "Posted · Just now";
  if (diffM < 60) return `Posted · ${diffM}m ago`;
  if (diffH < 24) return `Posted · ${diffH}h ago`;
  if (diffD < 7) return `Posted · ${diffD}d ago`;
  return `Posted · ${d.toLocaleDateString()}`;
}

/** Core columns every Jeanity `feed_posts` table has. */
export const FEED_POST_SELECT_BASE =
  "id, author_name, author_tag, avatar_url, avatar_emoji, caption, image_url, surface, launch_name, launch_categories, launch_logo_url, created_at";

/**
 * Default REST select — works before the feed-ranking migration (`likes_count`, `post_tags`, `is_featured`).
 * Try `FEED_POST_SELECT_WITH_COMMENTS` first in loaders; fall back to `FEED_POST_SELECT_BASE` if `comments_count` is missing.
 */
export const FEED_POST_SELECT_WITH_COMMENTS =
  `${FEED_POST_SELECT_BASE}, comments_count`;

/** After applying `supabase/schema.sql` (feed_posts likes_count, post_tags, is_featured). */
export const FEED_POST_SELECT_FULL =
  `${FEED_POST_SELECT_WITH_COMMENTS}, likes_count, post_tags, is_featured`;

/** @deprecated Use FEED_POST_SELECT_WITH_COMMENTS — kept as alias for imports. */
export const FEED_POST_SELECT = FEED_POST_SELECT_WITH_COMMENTS;

export function feedPostFromDbRow(r: DbFeedPost): FeedPost {
  return {
    id: r.id,
    authorName: r.author_name,
    authorTag: r.author_tag.startsWith("@") ? r.author_tag : `@${r.author_tag}`,
    avatarUrl: r.avatar_url,
    avatarEmoji: r.avatar_emoji,
    caption: r.caption,
    imageUrl: r.image_url,
    likes: r.likes_count ?? 0,
    comments: r.comments_count ?? 0,
    timeLabel: timeLabelFrom(r.created_at),
    surface: (r.surface as PostSurface) || undefined,
    launchName: r.launch_name ?? undefined,
    launchCategories: r.launch_categories ?? undefined,
    launchLogoUrl: r.launch_logo_url ?? undefined,
  };
}

/** Discord-style timestamp, e.g. "Today at 11:22 PM" */
export function formatCommentTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const d0 = startOf(d);
  const n0 = startOf(now);
  const dayMs = 86400000;
  const diffDays = Math.round((n0 - d0) / dayMs);

  const t = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today at ${t}`;
  if (diffDays === 1) return `Yesterday at ${t}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${datePart} at ${t}`;
}

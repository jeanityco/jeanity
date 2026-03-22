import { timeLabelFrom } from "@/features/feeds/feedPostFromDb";
import type { DbProduct, FeedPost, FeedProduct } from "@/features/feeds/feedsPostTypes";

export const PRODUCT_SELECT =
  "id, user_id, author_name, author_tag, name, tagline, categories, logo_url, upvotes, comments_count, created_at, updated_at";

export function productFromDbRow(r: DbProduct): FeedProduct {
  const tag = r.author_tag.startsWith("@") ? r.author_tag : `@${r.author_tag}`;
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    authorTag: tag,
    name: r.name,
    tagline: r.tagline ?? "",
    categories: r.categories ?? [],
    logoUrl: r.logo_url,
    upvotes: r.upvotes ?? 0,
    comments: r.comments_count ?? 0,
    createdAt: r.created_at,
  };
}

/** Reuse launch card UI (FeedsPostCard) for product detail. */
export function feedProductToLaunchFeedPost(p: FeedProduct): FeedPost {
  return {
    id: p.id,
    authorName: p.authorName,
    authorTag: p.authorTag,
    avatarUrl: null,
    avatarEmoji: null,
    caption: p.tagline.trim() || " ",
    imageUrl: null,
    likes: p.upvotes,
    comments: p.comments,
    timeLabel: timeLabelFrom(p.createdAt),
    surface: "Launch",
    launchName: p.name,
    launchCategories: p.categories,
    launchLogoUrl: p.logoUrl,
  };
}

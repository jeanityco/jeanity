import type { FeedPost } from "@/features/feeds/feedPostTypes";

type RankParams = {
  posts: FeedPost[];
  followedAuthorTags: Set<string>;
  interestTags: Set<string>;
};

function normalizeTag(tag: string) {
  return tag.replace(/^@/, "").trim().toLowerCase();
}

function parseInlineTags(caption: string): string[] {
  const tags = caption.match(/#[a-z0-9_-]+/gi) ?? [];
  return tags.map((t) => t.replace(/^#/, "").toLowerCase());
}

export function rankFallbackFeed({
  posts,
  followedAuthorTags,
  interestTags,
}: RankParams): FeedPost[] {
  const scored = posts.map((post) => {
    const author = normalizeTag(post.authorTag);
    const follow = followedAuthorTags.has(author) ? 1 : 0;
    const postTags = post.postTags?.length
      ? post.postTags.map((t) => t.toLowerCase())
      : parseInlineTags(post.caption);
    const matchingTags = postTags.filter((tag) => interestTags.has(tag)).length;
    const interest = Math.min(1, matchingTags / 2);
    const trending = Math.min(1, (post.likes + 1.8 * post.comments) / 25);
    const createdAt = Date.parse(post.createdAt ?? "");
    const ageHours = Number.isFinite(createdAt)
      ? Math.max(1, (Date.now() - createdAt) / 3_600_000)
      : 24;
    const recency = Math.exp(-ageHours / 36);
    const score =
      0.35 * follow + 0.25 * interest + 0.25 * trending + 0.15 * recency;
    return { post, score };
  });

  const ranked = scored.sort((a, b) => b.score - a.score).map((x) => x.post);
  const perAuthor = new Map<string, number>();
  const diversified: FeedPost[] = [];
  for (const post of ranked) {
    const author = normalizeTag(post.authorTag);
    const count = perAuthor.get(author) ?? 0;
    if (count >= 2) continue;
    perAuthor.set(author, count + 1);
    diversified.push(post);
  }
  return diversified;
}


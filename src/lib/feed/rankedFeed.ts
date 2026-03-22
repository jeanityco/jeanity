import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbFeedPost, FeedPost } from "@/features/feeds/feedsPostTypes";
import { feedPostFromDbRow } from "@/features/feeds/feedPostFromDb";

/**
 * Cursor for `get_ranked_feed_posts` (lexicographic DESC on rank_score, created_at, id).
 */
export type FeedRankCursor = {
  rankScore: number;
  createdAt: string;
  id: string;
};

type RpcRow = DbFeedPost & { rank_score: number };

export function cursorFromLastPost(rows: RpcRow[]): FeedRankCursor | null {
  const last = rows[rows.length - 1];
  if (!last) return null;
  return {
    rankScore: last.rank_score,
    createdAt: last.created_at,
    id: last.id,
  };
}

export function rankedRowsToPosts(rows: RpcRow[] | null): FeedPost[] {
  if (!rows?.length) return [];
  return rows.map((r) => {
    const { rank_score: _rs, ...db } = r;
    return feedPostFromDbRow(db);
  });
}

/**
 * Fetches one page from the personalized feed RPC.
 * Returns `{ posts, cursor, error }`; on RPC failure callers should fall back to chronological load.
 */
export async function fetchRankedFeedPage(
  supabase: SupabaseClient,
  opts: {
    viewerId: string | null;
    limit?: number;
    cursor?: FeedRankCursor | null;
  }
): Promise<{ posts: FeedPost[]; nextCursor: FeedRankCursor | null; rawRows: RpcRow[]; error: Error | null }> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const { data, error } = await supabase.rpc("get_ranked_feed_posts", {
    p_viewer_id: opts.viewerId,
    p_limit: limit,
    p_cursor_score: opts.cursor?.rankScore ?? null,
    p_cursor_created_at: opts.cursor?.createdAt ?? null,
    p_cursor_id: opts.cursor?.id ?? null,
  });

  if (error) {
    return {
      posts: [],
      nextCursor: null,
      rawRows: [],
      error: new Error(error.message),
    };
  }

  const rawRows = (data ?? []) as RpcRow[];
  return {
    posts: rankedRowsToPosts(rawRows),
    nextCursor: cursorFromLastPost(rawRows),
    rawRows,
    error: null,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers: number;
};

export type SearchPost = {
  id: string;
  caption: string;
  author_name: string;
  author_tag: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export type SearchSpace = {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
  members: number;
};

export type SearchAllResult = {
  users: SearchUser[];
  posts: SearchPost[];
  spaces: SearchSpace[];
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type PostRow = {
  id: string;
  caption: string;
  author_name: string;
  author_tag: string;
  avatar_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
};

type SpaceRow = {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
};

function scoreTextMatch(candidate: string, query: string) {
  const c = candidate.toLowerCase();
  const q = query.toLowerCase();
  if (c === q) return 1.0;
  if (c.startsWith(q)) return 0.85;
  if (c.includes(q)) return 0.65;
  return 0.2;
}

export async function searchAll(
  supabase: SupabaseClient,
  query: string
): Promise<SearchAllResult> {
  const q = query.trim();
  if (!q) return { users: [], posts: [], spaces: [] };

  const like = `%${q}%`;
  const [usersRes, postsRes, spacesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .or(`username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`)
      .limit(12),
    supabase
      .from("feed_posts")
      .select("id, caption, author_name, author_tag, avatar_url, likes_count, comments_count, created_at")
      .ilike("caption", like)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("spaces")
      .select("id, code, name, icon_url")
      .or(`name.ilike.${like},code.ilike.${like}`)
      .limit(12),
  ]);

  const userRows = (usersRes.data ?? []) as ProfileRow[];
  const postRows = (postsRes.data ?? []) as PostRow[];
  const spaceRows = (spacesRes.data ?? []) as SpaceRow[];

  const followerCounts = await Promise.all(
    userRows.map(async (row) => {
      const { count } = await supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", row.id);
      return { id: row.id, count: count ?? 0 };
    })
  );
  const followersByUser = new Map(followerCounts.map((x) => [x.id, x.count]));

  const users = userRows
    .map((row) => {
      const textScore = Math.max(
        scoreTextMatch(row.username ?? "", q),
        scoreTextMatch(row.display_name ?? "", q),
        scoreTextMatch(row.bio ?? "", q)
      );
      const popularity = Math.min(1, (followersByUser.get(row.id) ?? 0) / 200);
      return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        bio: row.bio,
        followers: followersByUser.get(row.id) ?? 0,
        _score: 0.75 * textScore + 0.25 * popularity,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      username: item.username,
      display_name: item.display_name,
      avatar_url: item.avatar_url,
      bio: item.bio,
      followers: item.followers,
    }));

  const posts = postRows
    .map((row) => {
      const textScore = scoreTextMatch(row.caption ?? "", q);
      const popularity = Math.min(
        1,
        ((row.likes_count ?? 0) + 1.8 * (row.comments_count ?? 0)) / 80
      );
      return {
        id: row.id,
        caption: row.caption,
        author_name: row.author_name,
        author_tag: row.author_tag,
        avatar_url: row.avatar_url,
        likes_count: row.likes_count ?? 0,
        comments_count: row.comments_count ?? 0,
        created_at: row.created_at,
        _score: 0.7 * textScore + 0.3 * popularity,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      caption: item.caption,
      author_name: item.author_name,
      author_tag: item.author_tag,
      avatar_url: item.avatar_url,
      likes_count: item.likes_count,
      comments_count: item.comments_count,
      created_at: item.created_at,
    }));

  const spaceMemberCounts = await Promise.all(
    spaceRows.map(async (row) => {
      const { count } = await supabase
        .from("space_members")
        .select("user_id", { count: "exact", head: true })
        .eq("space_id", row.id);
      return { id: row.id, count: count ?? 0 };
    })
  );
  const membersBySpace = new Map(spaceMemberCounts.map((x) => [x.id, x.count]));

  const spaces = spaceRows
    .map((row) => {
      const textScore = Math.max(
        scoreTextMatch(row.name ?? "", q),
        scoreTextMatch(row.code ?? "", q)
      );
      const popularity = Math.min(1, (membersBySpace.get(row.id) ?? 0) / 300);
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        icon_url: row.icon_url,
        members: membersBySpace.get(row.id) ?? 0,
        _score: 0.75 * textScore + 0.25 * popularity,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      icon_url: item.icon_url,
      members: item.members,
    }));

  return { users, posts, spaces };
}


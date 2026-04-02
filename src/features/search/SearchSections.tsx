"use client";

import Link from "next/link";
import { publicProfilePath } from "@/lib/profilePath";
import type { SearchPost, SearchSpace, SearchUser } from "@/lib/search/searchAll";

export function SectionFrame({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#111a29]/70 p-4 ring-1 ring-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
        {seeAllHref ? (
          <Link href={seeAllHref} className="text-xs text-sky-300 hover:text-sky-200">
            See all
          </Link>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function UsersSection({
  users,
  followingIds,
  onToggleFollow,
}: {
  users: SearchUser[];
  followingIds: Set<string>;
  onToggleFollow: (userId: string) => Promise<void>;
}) {
  return (
    <SectionFrame title="Users">
      {users.slice(0, 5).map((user) => {
        const isFollowing = followingIds.has(user.id);
        return (
          <div key={user.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
            <Link href={publicProfilePath(user.username)} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">
                  {(user.display_name || user.username).charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <Link href={publicProfilePath(user.username)} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.display_name || user.username}</p>
              <p className="truncate text-xs text-slate-400">@{user.username.replace(/^@/, "")}</p>
              {user.bio ? <p className="line-clamp-1 text-xs text-slate-500">{user.bio}</p> : null}
            </Link>
            <button
              type="button"
              onClick={() => void onToggleFollow(user.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isFollowing
                  ? "border border-white/15 bg-white/5 text-slate-200"
                  : "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        );
      })}
    </SectionFrame>
  );
}

export function PostsSection({ posts }: { posts: SearchPost[] }) {
  return (
    <SectionFrame title="Posts">
      {posts.slice(0, 5).map((post) => (
        <Link
          key={post.id}
          href={`/feeds/post/${post.id}`}
          className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5 transition hover:bg-white/[0.08]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
            {post.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{post.author_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm text-slate-200">{post.caption || "Open post"}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{post.author_tag}</span>
              <span>·</span>
              <span>{post.likes_count} likes</span>
              <span>·</span>
              <span>{post.comments_count} comments</span>
            </div>
          </div>
        </Link>
      ))}
    </SectionFrame>
  );
}

export function SpacesSection({
  spaces,
  onJoin,
}: {
  spaces: SearchSpace[];
  onJoin: (space: SearchSpace) => Promise<void>;
}) {
  return (
    <SectionFrame title="Spaces">
      {spaces.slice(0, 5).map((space) => (
        <div key={space.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
          <Link href={`/invite/${space.code}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <span className="text-sm font-bold text-white">{space.name.charAt(0).toUpperCase()}</span>
          </Link>
          <Link href={`/invite/${space.code}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{space.name}</p>
            <p className="text-xs text-slate-500">{space.members} members</p>
          </Link>
          <button
            type="button"
            onClick={() => void onJoin(space)}
            className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30"
          >
            Join
          </button>
        </div>
      ))}
    </SectionFrame>
  );
}

export function TrendingSection({
  tags,
  onPickTag,
}: {
  tags: string[];
  onPickTag: (tag: string) => void;
}) {
  return (
    <SectionFrame title="Trending">
      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 5).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onPickTag(tag)}
            className="rounded-full border border-slate-600/70 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-200"
          >
            #{tag}
          </button>
        ))}
      </div>
    </SectionFrame>
  );
}


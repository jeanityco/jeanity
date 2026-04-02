"use client";

import Link from "next/link";
import type { PostComment } from "@/features/feeds/feedPostTypes";
import { publicProfilePath } from "@/lib/profilePath";

function avatarLetter(name: string) {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

type FeedsDiscordCommentProps = {
  comment: PostComment;
  /** Current user's tag (with @) — used to highlight your own comments */
  viewerTag: string | null;
  viewerUserId?: string | null;
};

const avatarLinkClass =
  "shrink-0 rounded-xl ring-2 ring-white/10 transition hover:ring-sky-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";

export function FeedsDiscordComment({ comment, viewerTag, viewerUserId }: FeedsDiscordCommentProps) {
  const normalizedViewer = viewerTag?.replace(/^@/, "").toLowerCase() ?? "";
  const normalizedAuthor = comment.authorTag.replace(/^@/, "").toLowerCase();
  const tagMatch = Boolean(normalizedViewer && normalizedAuthor === normalizedViewer);
  const idMatch = Boolean(
    viewerUserId && comment.userId && viewerUserId === comment.userId
  );
  const isSelf = idMatch || tagMatch;

  const displayName =
    comment.authorName.trim() ||
    comment.authorTag.replace(/^@/, "").replace(/[._-]/g, " ") ||
    "Member";
  const time = comment.timeDetail ?? comment.timeLabel;
  const profileHref = publicProfilePath(comment.authorTag);
  const profileLabel = isSelf ? "Your profile" : `${comment.authorName} profile`;

  return (
    <li className="flex flex-row items-start gap-3 py-2">
      <Link
        href={profileHref}
        prefetch={false}
        className={avatarLinkClass}
        aria-label={profileLabel}
      >
        {comment.avatarUrl ? (
          <div
            className="h-10 w-10 rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${comment.avatarUrl})` }}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-sm font-semibold text-white">
            {avatarLetter(comment.authorName)}
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={profileHref}
            prefetch={false}
            className={
              isSelf
                ? "font-semibold text-amber-400 hover:underline"
                : "font-semibold text-[#e3e5e8] hover:underline"
            }
          >
            {displayName}
          </Link>
          <Link
            href={profileHref}
            prefetch={false}
            className="text-sm font-medium text-slate-500 hover:text-slate-300 hover:underline"
          >
            {comment.authorTag.startsWith("@") ? comment.authorTag : `@${comment.authorTag}`}
          </Link>
          <span className="text-xs font-normal text-slate-500">{time}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-snug text-white">{comment.text}</p>
      </div>
    </li>
  );
}

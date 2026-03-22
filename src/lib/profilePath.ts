/** Canonical @handle for URLs and comparisons */
export function normalizeUserTag(authorTag: string): string {
  return authorTag.startsWith("@") ? authorTag : `@${authorTag}`;
}

/** Public profile URL segment: `/@username` (dynamic route). */
export function publicProfilePath(authorTag: string): string {
  return `/${normalizeUserTag(authorTag)}`;
}

/** Sidebar / mobile nav: fall back to feeds when logged out or auth not ready. */
export function sidebarProfilePath(tag: string | null, ready: boolean): string {
  if (!ready || !tag) return "/feeds";
  return publicProfilePath(tag);
}

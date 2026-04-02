/** Same gradient as Ranking “Launch” — use for rail tiles and that CTA. */
export const shellLaunchGradientClass =
  "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 shadow-md shadow-emerald-500/15";

/** Rail squares: gradient + edge definition on dark chrome. */
export const shellRailTileClass = `${shellLaunchGradientClass} ring-1 ring-white/10 transition hover:brightness-110`;

/** Icon / letter color on the bright launch gradient. */
export const shellRailOnLaunchClass = "text-slate-950";

/**
 * Shared layout classes for pages inside {@link AppShell}.
 * - `pb` clears the fixed bottom tab bar on phone/tablet + iOS home indicator.
 * - `min-w-0` / `min-h-0` avoid flex overflow on narrow viewports.
 */

const bottomMobile = "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]";

/** Feeds, Search, Post detail (standard top padding). */
export const shellMainColumn =
  `relative z-10 flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col pt-3 sm:pt-4 ${bottomMobile} md:min-h-screen md:pb-10 md:pt-0`;

/** Profile: no extra top padding (hero banner is first). */
export const shellProfileColumn =
  `relative z-10 flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col ${bottomMobile} md:min-h-screen md:pb-10`;

/** Settings (scrolls inside; keep bottom clearance for mobile nav). */
export const shellSettingsColumn =
  `relative z-10 flex h-full min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col overflow-hidden pt-3 sm:pt-4 ${bottomMobile} md:pb-24 md:pt-0`;

/** Space chat: mobile bottom nav; desktop full height without extra pb. */
export const shellSpaceColumn =
  `relative z-10 flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col ${bottomMobile} md:h-screen md:pb-0`;

/** Centered empty states (e.g. post not found). */
export const shellEmptyColumn =
  `relative z-10 flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col items-center justify-center px-4 py-12 text-center ${bottomMobile} md:py-10 md:pb-10`;

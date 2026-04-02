export type CoreLoopStage =
  | "discover"
  | "react"
  | "follow"
  | "go_deeper"
  | "return";

export const CORE_LOOP = {
  discover: "Discover",
  react: "React",
  follow: "Follow",
  go_deeper: "Go deeper",
  return: "Return",
} as const;

export const CORE_LOOP_SEQUENCE: CoreLoopStage[] = [
  "discover",
  "react",
  "follow",
  "go_deeper",
  "return",
];

export const CORE_LOOP_CTA = {
  openRanking: "See what is trending",
  openProfile: "View creator profile",
  followCreator: "Follow creator",
  joinSpace: "Join creator space",
  openDiscussion: "Open discussion",
  backToFeed: "Back to your feed",
} as const;


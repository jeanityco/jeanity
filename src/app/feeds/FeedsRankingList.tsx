const RANKING_ITEMS = [
  {
    rank: 1,
    name: "Agent 37",
    description: "Your own OpenClaw instance for $3.99/mo",
    categories: ["Productivity", "Developer Tools", "Artificial Intelligence"],
    upvotes: 249,
    icon: "nodes" as const,
    iconBg: "from-slate-800 to-slate-900",
  },
  {
    rank: 2,
    name: "Lemon",
    description: "Voice-Powered AI Agent That Turns Speech Into Done Tasks",
    categories: ["Productivity", "Task Management"],
    upvotes: 199,
    icon: "lemon" as const,
    iconBg: "from-amber-400 to-yellow-300",
  },
  {
    rank: 3,
    name: "Struct",
    description: "AI agent that root-causes engineering alerts",
    categories: ["Artificial Intelligence"],
    upvotes: 183,
    icon: "struct" as const,
    iconBg: "from-zinc-800 to-zinc-950",
  },
  {
    rank: 4,
    name: "Socra",
    description: "From Curiosity to Mastery: Socrates-Powered Learning",
    categories: ["Android", "Productivity", "Education"],
    upvotes: 156,
    icon: "socra" as const,
    iconBg: "from-violet-600 to-indigo-600",
  },
];

function RankIcon({ type, className }: { type: (typeof RANKING_ITEMS)[0]["icon"]; className: string }) {
  const box = `flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/10 ${className}`;
  switch (type) {
    case "nodes":
      return (
        <div className={box}>
          <svg className="h-8 w-8 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13l4 4m0-4l-4 4" />
          </svg>
        </div>
      );
    case "lemon":
      return (
        <div className={`${box} !bg-black`}>
          <svg className="h-9 w-9 text-amber-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <ellipse key={deg} cx="12" cy="6" rx="1.8" ry="5" transform={`rotate(${deg} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="3" className="text-amber-200" />
          </svg>
        </div>
      );
    case "struct":
      return (
        <div className={`${box}`}>
          <span className="font-mono text-lg font-bold text-white">{`{}`}</span>
        </div>
      );
    case "socra":
      return (
        <div className={box}>
          <svg className="h-10 w-10" viewBox="0 0 32 32" aria-hidden>
            <defs>
              <linearGradient id="socra-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <path fill="url(#socra-g)" d="M16 4c6 0 10 4 10 9 0 5-4 8-10 14C10 21 6 18 6 13c0-5 4-9 10-9z" />
          </svg>
        </div>
      );
    default:
      return <div className={box} />;
  }
}

export function FeedsRankingList() {
  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
        <h2 className="text-lg font-semibold text-white">Ranking</h2>
        <p className="mt-0.5 text-sm text-slate-500">Top tools and agents on Jeanity this week</p>
      </div>
      <ul className="space-y-2">
        {RANKING_ITEMS.map((item) => (
          <li
            key={item.rank}
            className="flex gap-4 rounded-2xl border border-white/6 bg-white/[0.04] p-4 ring-1 ring-white/5 transition hover:border-emerald-500/20 hover:bg-white/[0.06]"
          >
            <RankIcon type={item.icon} className={item.iconBg} />
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-slate-100 sm:text-base">
                <span className="text-slate-500">{item.rank}.</span> {item.name}
              </h3>
              <p className="mt-1 text-sm leading-snug text-slate-400">{item.description}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {item.categories.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rotate-45 bg-slate-500" aria-hidden />
                    {c}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/8">
                <svg className="h-4 w-4 text-emerald-400/90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4l8 14H4L12 4zm0 4.5L7.5 16h9L12 8.5z" />
                </svg>
                <span className="mt-1 text-sm font-semibold tabular-nums text-slate-300">{item.upvotes}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

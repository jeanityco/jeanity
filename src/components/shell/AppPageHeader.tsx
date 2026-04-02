import type { ReactNode } from "react";

type AppPageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Right side: user chip, account menu, etc. */
  trailing?: ReactNode;
};

/** Sticky top bar used on Feeds, Search, Settings (not post detail). */
export function AppPageHeader({ title, subtitle, trailing }: AppPageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 shrink-0 border-b hairline-divider bg-[color:var(--bg-app)]/88 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-xl sm:px-6 md:px-8 md:py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4">
          <button
            type="button"
            aria-label="Menu"
            className="ui-transition flex h-11 w-11 shrink-0 items-center justify-center rounded-full border hairline-divider bg-white/5 md:hidden hover:bg-white/10"
          >
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-4 rounded-full bg-white/80" />
              <span className="h-0.5 w-4 rounded-full bg-white/80" />
              <span className="h-0.5 w-4 rounded-full bg-white/80" />
            </span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-xl md:text-[1.7rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="hidden truncate text-xs text-slate-400 sm:block md:text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {trailing ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:flex-initial md:gap-4">
            {trailing}
          </div>
        ) : null}
      </div>
    </header>
  );
}

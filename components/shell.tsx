"use client";

import { History, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Shell({
  view,
  onView,
  onNew,
  onSettings,
  hasKey,
  recording,
  newDisabled,
  children,
}: {
  view: "workspace" | "history";
  onView: (view: "workspace" | "history") => void;
  onNew: () => void;
  onSettings: () => void;
  hasKey: boolean;
  recording: boolean;
  newDisabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="no-print hidden bg-[oklch(0.29_0.035_168)] text-[oklch(0.96_0.012_90)] md:flex md:min-h-dvh md:flex-col md:px-4 md:py-6">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1" aria-label="主要">
          <NavButton active={view === "workspace"} onClick={onNew} disabled={newDisabled}>
            <Plus />
            新會議
          </NavButton>
          <NavButton active={view === "history"} onClick={() => onView("history")}>
            <History />
            歷史會議
          </NavButton>
        </nav>
        <div className="mt-auto space-y-3">
          <p className="rounded-xl bg-white/8 px-3 py-2 text-xs leading-5 text-white/80">
            {hasKey ? "API 金鑰已存在這台瀏覽器。" : "尚未設定 API 金鑰。即時字幕仍可使用。"}
          </p>
          <Button
            variant="secondary"
            className="h-10 w-full justify-start bg-white/10 text-white hover:bg-white/16"
            onClick={onSettings}
          >
            <Settings />
            設定
          </Button>
          {recording ? <p className="text-xs text-[oklch(0.86_0.08_70)]">錄音進行中</p> : null}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-foreground/8 bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10" onClick={onNew} disabled={newDisabled}>
              <Plus />
              新會議
            </Button>
            <Button variant="ghost" size="icon" className="size-10" onClick={onSettings} aria-label="設定">
              <Settings />
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10">
          {children}
        </main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-white/10 bg-[oklch(0.29_0.035_168)] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] text-[oklch(0.96_0.012_90)] md:hidden"
        aria-label="主要"
      >
        <button
          type="button"
          className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-xs", view === "workspace" && "text-[oklch(0.86_0.08_150)]")}
          onClick={() => onView("workspace")}
        >
          <Plus className="size-4" />
          這場會議
        </button>
        <button
          type="button"
          className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-xs", view === "history" && "text-[oklch(0.86_0.08_150)]")}
          onClick={() => onView("history")}
        >
          <History className="size-4" />
          歷史
        </button>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-[oklch(0.93_0.02_90)] text-base font-medium text-[oklch(0.29_0.035_168)]">
        會
      </span>
      <span>
        <span className="block text-base font-medium leading-none">會記</span>
        {compact ? null : (
          <span className="mt-1 block text-xs text-white/70">會議逐字稿與紀錄</span>
        )}
      </span>
    </div>
  );
}

function NavButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl px-3 text-sm disabled:opacity-40",
        active ? "bg-white/12" : "hover:bg-white/8",
      )}
    >
      {children}
    </button>
  );
}

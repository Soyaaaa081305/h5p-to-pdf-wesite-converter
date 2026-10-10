import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronLeft } from "lucide-react";
import { StudyReviewer } from "./StudyReviewer";
import type { GeneratedTranscript } from "../types/study";

interface Props {
  title: string;
  sourceText: string;
  pdfFile?: File;
  youtubeUrl?: string;
  youtubeUrls?: string[];
  onTranscriptReady?: (transcript: GeneratedTranscript) => void;
}

export function StudyReviewerDock({
  title,
  sourceText,
  pdfFile,
  youtubeUrl,
  youtubeUrls,
  onTranscriptReady,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const desktopWidthClass = !open
    ? "sm:w-[50vw] sm:left-auto sm:right-0"
    : isFullScreen
      ? "sm:w-screen sm:left-0 sm:right-0"
      : "sm:w-[50vw] sm:left-auto sm:right-0";

  const mobileHeightClass = isFullScreen
    ? "h-[calc(100dvh-3.5rem)]"
    : "h-[min(84dvh,720px)]";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close study guide"
          onClick={() => setOpen(false)}
          className="no-print fixed inset-0 z-40 bg-black/30 sm:hidden"
        />
      )}
      <aside
        aria-label="Study reviewer extension"
        className={`no-print fixed inset-x-0 bottom-0 z-50 flex ${mobileHeightClass} flex-col transition-[transform,width,height] duration-300 motion-reduce:transition-none sm:top-14 sm:h-[calc(100dvh-3.5rem)] ${desktopWidthClass} sm:flex-row ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-[calc(100%-3rem)] sm:translate-y-0 sm:translate-x-[calc(100%-3rem)]"
        }`}
      >
        <button
          type="button"
          aria-label={
            open ? "Collapse Summary & reviewer" : "Open Summary & reviewer"
          }
          aria-expanded={open}
          aria-controls="study-reviewer-extension"
          title={open ? "Collapse reviewer" : "Open reviewer"}
          onClick={() => setOpen((previous) => !previous)}
          className="flex h-12 min-h-12 w-full shrink-0 touch-manipulation items-center justify-between rounded-t-2xl border border-zinc-200 bg-white px-4 text-zinc-700 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:h-full sm:w-12 sm:flex-col sm:justify-center sm:gap-3 sm:rounded-l-xl sm:rounded-tr-none sm:px-0 sm:py-4"
        >
          <span className="flex items-center gap-2 sm:hidden">
            <BookOpenCheck aria-hidden="true" className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">
              Study guide
            </span>
          </span>
          <span className="hidden sm:contents">
            <ChevronLeft
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`}
            />
            <BookOpenCheck aria-hidden="true" className="h-4 w-4" />
            <span className="rotate-180 text-[11px] font-semibold uppercase tracking-[0.14em] [writing-mode:vertical-rl]">
              Study guide
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform sm:hidden ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div
          id="study-reviewer-extension"
          hidden={!open}
          className="min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto border-x border-b border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:border sm:pb-0"
        >
          <StudyReviewer
            compact
            title={title}
            sourceText={sourceText}
            pdfFile={pdfFile}
            youtubeUrl={youtubeUrl}
            youtubeUrls={youtubeUrls}
            isFullScreen={isFullScreen}
            onToggleFullScreen={() => setIsFullScreen((previous) => !previous)}
            onTranscriptReady={onTranscriptReady}
          />
        </div>
      </aside>
    </>
  );
}

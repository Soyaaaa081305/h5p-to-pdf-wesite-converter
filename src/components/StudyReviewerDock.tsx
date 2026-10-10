import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { LogoMark } from "./Logo";
import { StudyReviewer, type ReviewerStage } from "./StudyReviewer";
import type { GeneratedTranscript } from "../types/study";

interface Props {
  title: string;
  sourceText: string;
  pdfFile?: File;
  getPdfFile?: () => Promise<File>;
  sourcePdfLabel?: string;
  youtubeUrl?: string;
  youtubeUrls?: string[];
  onTranscriptReady?: (transcript: GeneratedTranscript) => void;
}

export function StudyReviewerDock({
  title,
  sourceText,
  pdfFile,
  getPdfFile,
  sourcePdfLabel,
  youtubeUrl,
  youtubeUrls,
  onTranscriptReady,
}: Props) {
  const [stage, setStage] = useState<ReviewerStage>("closed");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (stage === "half") {
        document.documentElement.dataset.reviewerStage = "half";
      } else if (stage === "full") {
        document.documentElement.dataset.reviewerStage = "full";
      } else {
        delete document.documentElement.dataset.reviewerStage;
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.reviewerStage;
      }
    };
  }, [stage]);

  const stepUp = () => {
    setStage((current) => {
      if (current === "closed") {
        setDirection("forward");
        return "compact";
      }
      if (current === "compact") {
        setDirection("forward");
        return "half";
      }
      if (current === "half") {
        setDirection("backward");
        return "full";
      }
      return "full";
    });
  };

  const stepDown = () => {
    setStage((current) => {
      if (current === "full") {
        setDirection("backward");
        return "half";
      }
      if (current === "half") {
        setDirection("backward");
        return "compact";
      }
      if (current === "compact") {
        setDirection("forward");
        return "closed";
      }
      return "closed";
    });
  };

  const handleSetStage = (next: ReviewerStage) => {
    setStage(next);
    if (next === "full") {
      setDirection("backward");
    } else if (next === "closed") {
      setDirection("forward");
    }
  };

  useEffect(() => {
    if (stage === "closed") return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stepDown();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [stage]);

  const isOpen = stage !== "closed";

  // Clicking the vertical "STUDY GUIDE" tab handle advances sequentially:
  // On mobile (< 640px): Closed <-> Open (Half)
  // On desktop (>= 640px):
  //   Forward expansion:  Closed (0) -> Compact (1: 30%) -> Half (2: 50%) -> Full screen (3: 100%)
  //   Sequential collapse: Full screen (3) -> Half (2: 50%) -> Compact (1: 30%) -> Closed (0)
  const handleTabClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setStage((current) => (current === "closed" ? "half" : "closed"));
      return;
    }
    setStage((current) => {
      if (current === "closed") {
        setDirection("forward");
        return "compact";
      }
      if (current === "full") {
        setDirection("backward");
        return "half";
      }
      if (current === "half") {
        if (direction === "forward") {
          setDirection("backward");
          return "full";
        }
        setDirection("backward");
        return "compact";
      }
      // current === "compact"
      if (direction === "forward") {
        setDirection("forward");
        return "half";
      }
      setDirection("forward");
      return "closed";
    });
  };

  // Toggle full screen from the reviewer header:
  const handleToggleFullScreen = () => {
    setStage((current) => {
      if (current === "full") {
        setDirection("backward");
        return "half";
      }
      setDirection("backward");
      return "full";
    });
  };

  // On desktop, keep `sm:right-0 sm:left-auto` pinned to the right edge at all times.
  // Increasing width from 30vw to 50vw to 100vw animates strictly from right to left.
  const desktopWidthClass =
    stage === "full"
      ? "sm:w-screen sm:left-auto sm:right-0"
      : stage === "half"
        ? "sm:w-[50vw] sm:left-auto sm:right-0"
        : "sm:w-[min(440px,30vw)] sm:left-auto sm:right-0";

  const mobileHeightClass =
    stage === "full" ? "h-[calc(100dvh-3.5rem)]" : "h-[min(84dvh,720px)]";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close study guide"
          onClick={() => setStage("closed")}
          className="no-print fixed inset-0 z-40 bg-black/30 sm:hidden"
        />
      )}
      <aside
        aria-label="Study reviewer extension"
        className={`no-print fixed inset-x-0 bottom-0 z-50 flex ${mobileHeightClass} flex-col transition-[width,transform,height] duration-300 ease-out motion-reduce:transition-none sm:top-14 sm:h-[calc(100dvh-3.5rem)] ${desktopWidthClass} sm:flex-row ${
          isOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-[calc(100%-3rem)] sm:translate-y-0 sm:translate-x-[calc(100%-3rem)]"
        }`}
      >
        <button
          type="button"
          aria-label={
            isOpen ? "Collapse Summary & reviewer" : "Open Summary & reviewer"
          }
          aria-expanded={isOpen}
          aria-controls="study-reviewer-extension"
          title={
            stage === "closed"
              ? "Open reviewer (Stage 1: 30%)"
              : stage === "compact"
                ? direction === "forward"
                  ? "Expand reviewer to 50% (Stage 2)"
                  : "Collapse reviewer"
                : stage === "half"
                  ? direction === "forward"
                    ? "Expand reviewer to Full screen (Stage 3)"
                    : "Collapse reviewer to 30% (Stage 1)"
                  : "Collapse reviewer to 50% (Stage 2)"
          }
          onClick={handleTabClick}
          className="flex h-12 min-h-12 w-full shrink-0 touch-manipulation items-center justify-between rounded-t-2xl border border-zinc-200 bg-white px-4 text-zinc-700 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:h-full sm:w-12 sm:flex-col sm:justify-center sm:gap-3 sm:rounded-l-xl sm:rounded-tr-none sm:px-0 sm:py-4"
        >
          <span className="flex items-center gap-2 sm:hidden">
            <LogoMark size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">
              Study guide
            </span>
          </span>
          <span className="hidden sm:contents">
            <ChevronLeft
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${
                direction === "backward" || stage === "full" ? "rotate-180" : ""
              }`}
            />
            <LogoMark size={20} />
            <span className="rotate-180 text-[11px] font-semibold uppercase tracking-[0.14em] [writing-mode:vertical-rl]">
              Study guide
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform sm:hidden ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        <div
          id="study-reviewer-extension"
          hidden={!isOpen}
          className="min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto border-x border-b border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:border sm:pb-0"
        >
          <StudyReviewer
            compact
            title={title}
            sourceText={sourceText}
            pdfFile={pdfFile}
            getPdfFile={getPdfFile}
            sourcePdfLabel={sourcePdfLabel}
            youtubeUrl={youtubeUrl}
            youtubeUrls={youtubeUrls}
            stage={stage}
            onSetStage={handleSetStage}
            onStepUp={stepUp}
            onStepDown={stepDown}
            onClose={() => setStage("closed")}
            isFullScreen={stage === "full"}
            onToggleFullScreen={handleToggleFullScreen}
            onTranscriptReady={onTranscriptReady}
          />
        </div>
      </aside>
    </>
  );
}

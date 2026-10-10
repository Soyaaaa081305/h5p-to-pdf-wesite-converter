import React, { useState } from "react";
import { Logo } from "./Logo";
import { Bookmark, Sun, Moon, Check, X } from "lucide-react";
import { useTheme } from "../lib/theme";
import { HelpDialog } from "./HelpDialog";

// 1-Click Bookmark: Instantly opens the H5P to PDF Converter from any tab or Blackboard
const bookmarkTarget =
  import.meta.env.VITE_APP_BASE_URL || "https://h5p-to-pdf-converter.web.app/";
export const BOOKMARKLET_CODE =
  "javascript:(function(){var w=window.open(" +
  JSON.stringify(bookmarkTarget) +
  ", '_blank');if(w)w.opener=null;})();";

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [showBookmarkHelp, setShowBookmarkHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn("Could not copy automatically:", err);
    }
    setShowBookmarkHelp(true);
  };

  return (
    <header className="no-print bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Logo size={28} />

        <div className="flex items-center gap-3">
          {/* Bookmark Button */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              H5P to PDF Bookmark
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Click to copy or drag to Bookmarks
            </span>
          </div>

          <a
            href={BOOKMARKLET_CODE}
            onClick={handleBookmarkClick}
            draggable={true}
            title="Click to copy bookmark, or drag to your Bookmarks Bar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium text-xs shadow-xs transition-transform active:scale-95 cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Bookmark</span>
            <span className="sm:hidden">Bookmark</span>
          </a>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </button>
        </div>
      </div>

      {/* Bookmark Confirmation & Drag Modal */}
      {showBookmarkHelp && (
        <HelpDialog
          labelledBy="bookmark-help-title"
          onClose={() => setShowBookmarkHelp(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="bookmark-help-title"
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans"
                >
                  H5P to PDF Quick Bookmark
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                  Shortcut to open the Converter from any tab or LMS page
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBookmarkHelp(false)}
              aria-label="Close bookmark help"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Banner */}
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              {copied
                ? "Bookmark URL copied to your clipboard!"
                : "Bookmark ready — drag below or add via browser!"}
            </span>
          </div>

          {/* 2 Ways to Add */}
          <div className="space-y-3 text-xs">
            {/* Option 1: Drag */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  Option 1: Drag to Bookmarks Bar
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Quickest
                </span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Make sure your bookmarks bar is visible (
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono text-[10px]">
                  Cmd+Shift+B
                </kbd>{" "}
                on Mac or{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono text-[10px]">
                  Ctrl+Shift+B
                </kbd>{" "}
                on Windows), then drag this button directly onto it:
              </p>
              <div className="pt-1 flex justify-center">
                <a
                  href={BOOKMARKLET_CODE}
                  draggable={true}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-semibold text-xs shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-105 active:scale-95"
                  onClick={(e) => e.preventDefault()}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Drag to Bookmarks Bar</span>
                </a>
              </div>
            </div>

            {/* Option 2: Add Bookmark */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                Option 2: Add via Browser Shortcut
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">
                  Cmd+D
                </kbd>{" "}
                or{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">
                  Ctrl+D
                </kbd>{" "}
                right now to bookmark this converter page directly.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowBookmarkHelp(false)}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-semibold text-xs shadow-xs transition-colors"
            >
              Got It!
            </button>
          </div>
        </HelpDialog>
      )}
    </header>
  );
};

import { ExternalLink } from "lucide-react";
import { GITHUB_REPOSITORY } from "../lib/links";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
      <a
        className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
        href="/privacy"
      >
        Privacy
      </a>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      <a
        className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
        href="/terms"
      >
        Terms
      </a>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      <a
        className="inline-flex items-center gap-1 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
        href={GITHUB_REPOSITORY}
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </footer>
  );
}

import { Trash2, X } from "lucide-react";

interface SourceTab {
  id: string;
  title: string;
  kind: string;
}

interface Props {
  sources: SourceTab[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

export function SourceManager({
  sources,
  selectedId,
  onSelect,
  onRemove,
  onReset,
}: Props) {
  if (sources.length === 0) return null;

  return (
    <nav
      aria-label="Loaded study materials"
      className="no-print border-b border-zinc-200/70 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5">
          {sources.map((source) => {
            const selected = source.id === selectedId;
            return (
              <div
                key={source.id}
                className={`inline-flex max-w-[260px] shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                  selected
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(source.id)}
                  className="flex min-w-0 items-center gap-1.5 text-left"
                  title={source.title}
                  aria-current={selected ? "page" : undefined}
                >
                  <span className="rounded bg-black/5 px-1 py-0.5 text-[9px] uppercase tracking-wide dark:bg-white/10">
                    {source.kind}
                  </span>
                  <span className="truncate">{source.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(source.id)}
                  aria-label={`Remove ${source.title}`}
                  title="Remove source"
                  className="rounded p-0.5 opacity-60 hover:bg-rose-100 hover:text-rose-700 hover:opacity-100 dark:hover:bg-rose-950"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear all
        </button>
      </div>
    </nav>
  );
}

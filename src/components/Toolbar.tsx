import React, { useState, useRef, useEffect, useMemo } from "react";
import type { H5PPackage } from "../types/h5p";
import { externalUrl } from "../lib/security";
import { extractYouTubeId } from "./SafeMedia";
import { ReviewerModal } from "./ReviewerModal";
import {
  Download,
  RotateCcw,
  Loader2,
  ExternalLink,
  BookOpen,
  Plus,
  X,
  Layers,
} from "lucide-react";

interface ToolbarProps {
  packages: H5PPackage[];
  activePkgIndex: number;
  onSelectPackage: (index: number) => void;
  onRemovePackage: (index: number) => void;
  onAddFiles: (files: File[]) => Promise<void>;
  onResetAll: () => void;
}

function getModuleBadge(pkg: H5PPackage): string {
  return `${pkg.report.answers.length} q`;
}
function getModuleDescription(pkg: H5PPackage): string {
  const recovered = pkg.report.answers.filter(
    (a) => a.status === "extracted",
  ).length;
  return `${recovered}/${pkg.report.answers.length} answer activities extracted`;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  packages,
  activePkgIndex,
  onSelectPackage,
  onRemovePackage,
  onAddFiles,
  onResetAll,
}) => {
  const exportController = useRef<AbortController>();
  useEffect(() => () => exportController.current?.abort(), [packages]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [showReviewer, setShowReviewer] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const currentPkg = packages[activePkgIndex] || packages[0];
  if (!currentPkg) return null;

  // Single module export
  const handleDownloadSinglePdf = async () => {
    try {
      exportController.current = new AbortController();
      setIsExporting(true);
      setExportProgress("Preparing slides...");
      const { exportSlidesToPdf } = await import("../lib/pdfExporter");
      await exportSlidesToPdf(
        currentPkg,
        (curr, total) => {
          setExportProgress(`Compiling ${curr}/${total}`);
        },
        exportController.current.signal,
      );
    } catch (err: any) {
      if (exportController.current?.signal.aborted) return;
      alert("Failed to generate PDF: " + (err?.message || "Unknown error"));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Batch merge all modules export
  const handleDownloadBatchPdf = async () => {
    try {
      exportController.current = new AbortController();
      setIsExporting(true);
      setExportProgress("Merging all modules...");
      const { exportBatchToPdf } = await import("../lib/pdfExporter");
      await exportBatchToPdf(
        packages,
        (curr, total, modName) => {
          setExportProgress(
            `Item ${curr}/${total} (${modName.slice(0, 15)}...)`,
          );
        },
        exportController.current.signal,
      );
    } catch (err: any) {
      if (exportController.current?.signal.aborted) return;
      alert("Failed to batch merge PDF: " + (err?.message || "Unknown error"));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const handleAddFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const title = currentPkg.metadata.title || currentPkg.fileName;
  const hasSlides = Boolean(currentPkg.content?.presentation?.slides?.length);
  const moduleDescription = getModuleDescription(currentPkg);

  // Extract Canva / external presentation link and YouTube link from active module (memoized)
  const { canvaUrl, youtubeUrl } = useMemo(() => {
    let cUrl: string | null = null;
    let yUrl: string | null = null;

    // 1. Check Interactive Video video sources
    const ivSources: any[] =
      currentPkg.content?.interactiveVideo?.video?.files ||
      currentPkg.content?.interactiveVideo?.video?.sources ||
      currentPkg.content?.interactiveVideo?.files ||
      currentPkg.content?.interactiveVideo?.sources ||
      [];
    for (const s of ivSources) {
      const p = typeof s === "string" ? s : s?.path || s?.url;
      const yId = extractYouTubeId(p);
      if (yId) {
        yUrl = `https://www.youtube.com/watch?v=${yId}`;
        break;
      }
    }

    // 2. Check Course Presentation Slides
    const slides: any[] = currentPkg.content?.presentation?.slides || [];
    slides.forEach((s) => {
      (s.elements || []).forEach((el: any) => {
        if (el.action?.library?.includes("Link")) {
          let u =
            el.action.params?.linkWidget?.url || el.action.params?.url || "";
          const proto = el.action.params?.linkWidget?.protocol || "";
          if (proto && !u.startsWith("http://") && !u.startsWith("https://")) {
            u = `${proto}${u}`;
          }
          u = u.replace(/&amp;/g, "&");
          const yId = extractYouTubeId(u);
          if (yId && !yUrl) {
            yUrl = `https://www.youtube.com/watch?v=${yId}`;
          }
          if (u.includes("canva.com") && !cUrl) {
            cUrl = externalUrl(u) || null;
          } else if (!cUrl && externalUrl(u)) {
            cUrl = externalUrl(u) || null;
          }
        } else if (el.action?.library?.includes("Video")) {
          const src = (el.action.params?.sources ||
            el.action.params?.files)?.[0]?.path;
          const yId = extractYouTubeId(src);
          if (yId && !yUrl) {
            yUrl = `https://www.youtube.com/watch?v=${yId}`;
          }
        }
      });
    });

    return { canvaUrl: cUrl, youtubeUrl: yUrl };
  }, [currentPkg]);

  // Calculate total slides across all packages (memoized)
  const totalBatchSlides = useMemo(
    () =>
      packages.reduce(
        (sum, p) => sum + (p.content?.presentation?.slides?.length || 0),
        0,
      ),
    [packages],
  );

  return (
    <div className="no-print bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20 transition-colors">
      {/* Hidden file input for adding more modules */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept=".h5p,.zip,.pdf,.html,.htm,.txt,.md,.srt,.vtt"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose additional study files"
        onChange={handleAddFileInputChange}
      />

      {/* Playlist Module Tabs Bar (shown when multiple modules exist, or if requested) */}
      {packages.length > 1 && (
        <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 mr-2 flex-shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Playlist ({packages.length}):</span>
            </div>

            <div className="flex items-center gap-1.5 flex-nowrap">
              {packages.map((pkgItem, idx) => {
                const isActive = idx === activePkgIndex;
                const pTitle = pkgItem.metadata.title || pkgItem.fileName;
                const pBadge = getModuleBadge(pkgItem);

                return (
                  <div
                    key={pkgItem.fileName + idx}
                    className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300"
                    }`}
                    onClick={() => onSelectPackage(idx)}
                    title={pTitle}
                  >
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                      {pTitle}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {pBadge}
                    </span>
                    {packages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePackage(idx);
                        }}
                        className={`p-0.5 rounded hover:bg-rose-500 hover:text-white transition-colors ml-0.5 ${
                          isActive
                            ? "text-zinc-400 dark:text-zinc-600"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                        title="Remove module from playlist"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Module Tab Button */}
              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 text-xs font-medium flex-shrink-0 transition-colors"
                title="Add another course or study source"
              >
                <Plus className="w-3 h-3" />
                <span>Add Source</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Document Metadata */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md font-sans"
              title={title}
            >
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {packages.length > 1 && (
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  Module {activePkgIndex + 1}/{packages.length}
                </span>
              )}
              <span>{moduleDescription}</span>
              <span>• {(currentPkg.fileSize / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Answers Button */}
          <button
            type="button"
            onClick={() => setShowReviewer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold shadow-2xs transition-colors"
            title="Open Answers"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Answers</span>
          </button>

          {/* Prominent YouTube Link if detected */}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold shadow-2xs transition-colors"
              title="Open video directly on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Watch on YouTube</span>
            </a>
          )}

          {/* Prominent Canva Link if detected */}
          {canvaUrl && (
            <a
              href={canvaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold shadow-2xs transition-colors"
              title="Open full presentation directly in Canva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View in Canva</span>
            </a>
          )}

          {/* Batch Merge All Button (if more than 1 module) */}
          {packages.length > 1 && (
            <button
              type="button"
              onClick={handleDownloadBatchPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title={`Merge all ${packages.length} modules into 1 PDF`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{exportProgress || "Merging..."}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {totalBatchSlides > 0
                      ? `Merge All (${packages.length}) to 1 PDF`
                      : `Export All (${packages.length}) Study Guide`}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Single Module PDF Download */}
          <button
            type="button"
            onClick={handleDownloadSinglePdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            title={
              packages.length > 1
                ? "Download this current module PDF"
                : "Download full PDF"
            }
          >
            {isExporting && packages.length === 1 ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{exportProgress || "Exporting..."}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {packages.length > 1
                    ? hasSlides
                      ? "This Module PDF"
                      : "This Module Study PDF"
                    : hasSlides
                      ? "Download PDF"
                      : "Download Study PDF"}
                </span>
              </>
            )}
          </button>

          {/* Cancel Export button if actively exporting */}
          {isExporting && (
            <button
              type="button"
              onClick={() => exportController.current?.abort()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition-colors"
              title="Cancel export"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          {/* If single module, show "+ Add Module" to encourage playlist usage */}
          {packages.length === 1 && (
            <button
              type="button"
              onClick={() => addFileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium shadow-2xs transition-colors"
              title="Add another .h5p module to playlist"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </button>
          )}

          {/* Reset / Clear All */}
          <button
            type="button"
            onClick={onResetAll}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close modules and upload another"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ReviewerModal
        packages={packages}
        pkg={currentPkg}
        isOpen={showReviewer}
        onClose={() => setShowReviewer(false)}
      />
    </div>
  );
};

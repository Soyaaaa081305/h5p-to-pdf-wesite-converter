import { useRef } from "react";
import { ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import type { StudyMaterial } from "../types/study";
import { extractYouTubeId } from "../lib/youtube";
import { MAX_REVIEW_CHARS } from "../lib/studyMaterials";
import { StudyReviewerDock } from "./StudyReviewerDock";
import type { GeneratedTranscript } from "../types/study";

interface Props {
  material: StudyMaterial;
  onRemove: () => void;
  onAddFiles: (files: File[]) => void;
  onTranscriptReady?: (transcript: GeneratedTranscript) => void;
}

export function StudyMaterialViewer({
  material,
  onRemove,
  onAddFiles,
  onTranscriptReady,
}: Props) {
  const sourceDescription =
    material.kind === "transcript" && material.text.length > MAX_REVIEW_CHARS
      ? `The full transcript remains available above. Gemini reviewer requests use its first ${MAX_REVIEW_CHARS.toLocaleString()} characters.`
      : "Your original file stays in this browser. Generating a reviewer or transcribing a selected audio/video file sends that chosen content to Google Gemini.";
  const fileInput = useRef<HTMLInputElement>(null);
  const youtubeId = material.youtubeUrl
    ? extractYouTubeId(material.youtubeUrl)
    : null;
  const typeLabel = {
    pdf: "PDF document",
    html: "HTML page",
    text: "Text document",
    transcript: "Video transcript",
    youtube: "YouTube video",
  }[material.kind];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".h5p,.zip,.pdf,.html,.htm,.txt,.md,.srt,.vtt"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose additional study files"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onAddFiles(files);
        }}
      />
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {material.name}
            </p>
            <p className="text-[11px] text-zinc-500">
              {typeLabel}
              {material.size
                ? ` · ${(material.size / 1024 / 1024).toFixed(1)} MB`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add material
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500">
              Source preview
            </p>
            <h1 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {material.name}
            </h1>
          </div>
          {material.pdfUrl && (
            <a
              href={material.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-print inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open PDF in new tab
            </a>
          )}
          {(material.youtubeUrl || material.sourceUrl) && (
            <a
              href={material.youtubeUrl || material.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-print inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open on YouTube
            </a>
          )}
        </div>

        {material.kind === "pdf" && material.pdfUrl && (
          <iframe
            title={`PDF preview: ${material.name}`}
            src={material.pdfUrl}
            className="h-[75vh] min-h-[480px] w-full bg-zinc-100 dark:bg-zinc-950"
          />
        )}
        {material.kind === "html" && material.html && (
          <article
            className="prose prose-zinc dark:prose-invert max-w-none px-6 py-6 sm:px-9 sm:py-8 prose-a:text-indigo-700 dark:prose-a:text-indigo-300 prose-table:block prose-table:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: material.html }}
          />
        )}
        {(material.kind === "text" || material.kind === "transcript") && (
          <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words px-5 py-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300 sm:px-8">
            {material.text}
          </pre>
        )}
        {material.kind === "youtube" && youtubeId && (
          <div className="aspect-video w-full bg-black">
            <iframe
              title={`YouTube video: ${material.name}`}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>

      <StudyReviewerDock
        title={material.name}
        sourceText={material.text}
        pdfFile={material.kind === "pdf" ? material.file : undefined}
        youtubeUrl={
          material.kind === "youtube" ? material.youtubeUrl : undefined
        }
        youtubeUrls={
          material.kind === "youtube" && material.youtubeUrl
            ? [material.youtubeUrl]
            : []
        }
        onTranscriptReady={onTranscriptReady}
        sourceDescription={sourceDescription}
      />
    </div>
  );
}

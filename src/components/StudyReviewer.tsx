import { useState } from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { LogoMark } from "./Logo";
import {
  checkGeminiApiKey,
  generateStudyReview,
  getSavedGeminiApiKey,
  removeGeminiApiKey,
  saveGeminiApiKey,
} from "../lib/gemini";
import { exportStudyReviewerPdf } from "../lib/reviewerPdfExporter";
import type { GeneratedTranscript, StudyReview } from "../types/study";

export type ReviewerStage = "closed" | "compact" | "half" | "full";

interface Props {
  title: string;
  sourceText: string;
  pdfFile?: File;
  getPdfFile?: () => Promise<File>;
  sourcePdfLabel?: string;
  youtubeUrl?: string;
  youtubeUrls?: string[];
  compact?: boolean;
  stage?: ReviewerStage;
  onSetStage?: (stage: ReviewerStage) => void;
  onStepDown?: () => void;
  onStepUp?: () => void;
  onClose?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onTranscriptReady?: (transcript: GeneratedTranscript) => void;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|resource exhausted|rate.?limit/i.test(message)) {
    return "This Gemini API key has reached its current limit. Check its quota or wait, then try again.";
  }
  if (
    /api.?key.?invalid|invalid api key|api key not valid|unauthenticated|401/i.test(
      message,
    )
  ) {
    return "Gemini rejected this key. Check that it is complete and active, then save it again.";
  }
  if (/403|permission.?denied|forbidden/i.test(message)) {
    return "Google denied this key. Check its Gemini API access, restrictions, and account eligibility.";
  }
  if (/404|not found/i.test(message)) {
    return "The selected Gemini model is unavailable for this key. Check the model setting or key access.";
  }
  if (/network|fetch|offline|failed to fetch/i.test(message)) {
    return "Gemini could not be reached. Check your connection or the key's website restrictions and try again.";
  }
  return (
    message.slice(0, 500) ||
    "The reviewer could not be generated. Please try again."
  );
}

function reviewAsMarkdown(review: StudyReview, includeAnswers = true): string {
  return [
    `# ${review.title}`,
    "",
    "## Study Summary",
    review.summary,
    "",
    "## Key Ideas",
    ...review.keyPoints.map((point, index) => `${index + 1}. ${point}`),
    "",
    "## Key Terms",
    ...review.terms.map(
      (term) =>
        `- **${term.term}**: ${term.definition}${term.source ? ` *(${term.source})*` : ""}`,
    ),
    "",
    `## Practice Questions${includeAnswers ? " (with Answers)" : ""}`,
    ...review.questions.map((item, index) => {
      const parts = [`### ${index + 1}. ${item.question}`];
      if (item.options.length) {
        parts.push(
          ...item.options.map(
            (option, i) => `   ${String.fromCharCode(65 + i)}. ${option}`,
          ),
        );
      }
      if (includeAnswers) {
        parts.push(`**Answer:** ${item.answer}`);
        if (item.explanation) parts.push(`*Why:* ${item.explanation}`);
      }
      if (item.source) parts.push(`*Source:* ${item.source}`);
      return parts.join("\n");
    }),
    "",
    "---",
    "*AI-generated study aid. Verify important facts with course material.*",
  ].join("\n\n");
}

function reviewAsHtml(review: StudyReview, includeAnswers = true): string {
  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #18181b; max-width: 800px;">
  <h1 style="color: #09090b; font-size: 22px; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px;">${escapeHtml(review.title)}</h1>
  <h2 style="color: #4f46e5; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 20px;">Study Summary</h2>
  <p style="font-size: 14px; color: #3f3f46;">${escapeHtml(review.summary)}</p>
  ${
    review.keyPoints.length
      ? `
  <h2 style="color: #4f46e5; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 20px;">Key Ideas</h2>
  <ol style="padding-left: 20px;">
    ${review.keyPoints.map((point) => `<li style="margin-bottom: 6px; font-size: 14px;">${escapeHtml(point)}</li>`).join("")}
  </ol>`
      : ""
  }
  ${
    review.terms.length
      ? `
  <h2 style="color: #4f46e5; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 20px;">Key Terms</h2>
  <dl style="margin: 0;">
    ${review.terms
      .map(
        (term) => `
      <div style="margin-bottom: 10px;">
        <dt style="font-weight: 700; color: #09090b;">${escapeHtml(term.term)}</dt>
        <dd style="margin: 2px 0 0; color: #52525b; font-size: 14px;">${escapeHtml(term.definition)} ${term.source ? `<span style="color: #4f46e5; font-size: 12px;">(${escapeHtml(term.source)})</span>` : ""}</dd>
      </div>`,
      )
      .join("")}
  </dl>`
      : ""
  }
  ${
    review.questions.length
      ? `
  <h2 style="color: #4f46e5; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 20px;">Practice Questions</h2>
  <div style="display: flex; flex-direction: column; gap: 14px;">
    ${review.questions
      .map(
        (item, index) => `
      <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; background: #fafafa;">
        <p style="font-weight: 600; margin: 0 0 6px;">${index + 1}. ${escapeHtml(item.question)}</p>
        ${
          item.options.length
            ? `<ol type="A" style="margin: 0 0 8px; padding-left: 20px; font-size: 13px; color: #52525b;">
          ${item.options.map((opt) => `<li>${escapeHtml(opt)}</li>`).join("")}
        </ol>`
            : ""
        }
        ${
          includeAnswers
            ? `<div style="border-top: 1px solid #e4e4e7; padding-top: 6px; margin-top: 6px;">
          <p style="color: #15803d; font-weight: 600; font-size: 13px; margin: 0;">Answer: ${escapeHtml(item.answer)}</p>
          ${item.explanation ? `<p style="color: #52525b; font-size: 13px; margin: 3px 0 0;">Why: ${escapeHtml(item.explanation)}</p>` : ""}
        </div>`
            : ""
        }
        ${item.source ? `<p style="color: #6366f1; font-size: 11px; margin: 5px 0 0;">Source: ${escapeHtml(item.source)}</p>` : ""}
      </div>`,
      )
      .join("")}
  </div>`
      : ""
  }
  <p style="border-top: 1px solid #e4e4e7; margin-top: 20px; padding-top: 10px; font-size: 11px; color: #a1a1aa;">
    AI-generated study aid. Verify important facts with course material.
  </p>
</div>`;
}

export function StudyReviewer({
  title,
  sourceText,
  pdfFile,
  getPdfFile,
  sourcePdfLabel,
  youtubeUrl,
  youtubeUrls = [],
  compact = false,
  stage,
  onSetStage,
  onStepDown,
  onClose,
  isFullScreen = false,
  onToggleFullScreen,
}: Props) {
  const [questionCount, setQuestionCount] = useState(10);
  const [apiKey, setApiKey] = useState(() => getSavedGeminiApiKey());
  const [keyDraft, setKeyDraft] = useState(() => getSavedGeminiApiKey());
  const [keyVisible, setKeyVisible] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState("");
  const [keyFeedbackError, setKeyFeedbackError] = useState(false);
  const [difficulty, setDifficulty] = useState<
    "introductory" | "standard" | "challenging"
  >("standard");
  const [customPrompt, setCustomPrompt] = useState("");

  const hasCourseText =
    Boolean(sourceText.trim()) || Boolean(pdfFile) || Boolean(getPdfFile);
  const [includeCourseText, setIncludeCourseText] = useState(true);
  const [selectedYoutubeUrls, setSelectedYoutubeUrls] = useState<string[]>([]);
  const [review, setReview] = useState<StudyReview>();
  const [activeReviewSection, setActiveReviewSection] = useState<
    "all" | "summary" | "ideas" | "terms" | "questions"
  >("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [answersVisible, setAnswersVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const videoSources = Array.from(
    new Set(youtubeUrls.length ? youtubeUrls : youtubeUrl ? [youtubeUrl] : []),
  );

  async function generate() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      let resolvedPdf = pdfFile;
      if (!resolvedPdf && getPdfFile && includeCourseText) {
        try {
          resolvedPdf = await getPdfFile();
        } catch {
          // If PDF generation fails, continue with text
        }
      }

      const next = await generateStudyReview({
        apiKey,
        title,
        sourceText: includeCourseText ? sourceText : "",
        questionCount,
        difficulty,
        youtubeUrls: selectedYoutubeUrls,
        customPrompt: customPrompt.trim() ? customPrompt.trim() : undefined,
        pdfFile: includeCourseText ? resolvedPdf : undefined,
      });
      setReview(next);
      setActiveReviewSection("all");
      setAnswersVisible(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  function saveKey() {
    const nextKey = keyDraft.trim();
    if (!nextKey) {
      setKeyFeedback("Paste your Gemini API key first.");
      setKeyFeedbackError(true);
      return;
    }
    const persisted = saveGeminiApiKey(nextKey);
    setApiKey(nextKey);
    setKeyDraft(nextKey);
    setKeyFeedback(
      persisted
        ? "Key saved in this browser."
        : "Key is ready for this session, but browser storage is unavailable.",
    );
    setKeyFeedbackError(false);
  }

  async function testKey() {
    setCheckingKey(true);
    setKeyFeedback("");
    try {
      await checkGeminiApiKey(keyDraft);
      setKeyFeedback(
        keyDraft.trim() === apiKey
          ? "Key works with the selected Gemini model."
          : "Key works. Save it to use it for reviewer generation.",
      );
      setKeyFeedbackError(false);
    } catch (caught) {
      setKeyFeedback(friendlyError(caught));
      setKeyFeedbackError(true);
    } finally {
      setCheckingKey(false);
    }
  }

  function clearKey() {
    const removed = removeGeminiApiKey();
    setApiKey("");
    setKeyDraft("");
    setKeyFeedback(
      removed
        ? "Saved key removed from this browser."
        : "The saved key could not be removed from browser storage.",
    );
    setKeyFeedbackError(!removed);
  }

  function toggleVideo(url: string) {
    setSelectedYoutubeUrls((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
  }

  async function copy() {
    if (!review) return;
    try {
      const markdown = reviewAsMarkdown(review, answersVisible);
      const html = reviewAsHtml(review, answersVisible);
      if (
        typeof navigator.clipboard?.write === "function" &&
        typeof window.ClipboardItem !== "undefined"
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(markdown);
      }
      setCopied(true);
      setMessage("Reviewer copied with rich formatting.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Clipboard access is unavailable in this browser.");
    }
  }

  const hasSelectedSource =
    (includeCourseText && hasCourseText) || selectedYoutubeUrls.length > 0;
  const canGenerate =
    Boolean(apiKey) &&
    keyDraft.trim() === apiKey &&
    !loading &&
    hasSelectedSource;

  return (
    <section
      id="study-reviewer"
      className={`study-reviewer overflow-hidden bg-white dark:bg-zinc-900 ${
        compact
          ? "min-h-full"
          : "my-8 rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800"
      }`}
    >
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-lg">
              Study Reviewer
            </h2>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            {stage && onSetStage && (
              <div
                role="group"
                aria-label="Reviewer size"
                className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <button
                  type="button"
                  onClick={() => onSetStage("compact")}
                  className={`rounded-lg px-2 py-1 text-xs transition ${
                    stage === "compact"
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                      : "hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Compact (30% width)"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => onSetStage("half")}
                  className={`rounded-lg px-2 py-1 text-xs transition ${
                    stage === "half"
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                      : "hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Split view (50% width)"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => onSetStage("full")}
                  className={`rounded-lg px-2 py-1 text-xs transition ${
                    stage === "full"
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                      : "hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Full screen (100% width)"
                >
                  Full
                </button>
              </div>
            )}
            {stage === "half" && onStepDown && (
              <button
                type="button"
                onClick={onStepDown}
                aria-label="30% view"
                title="Collapse to 30% view (Stage 1)"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>30% view</span>
              </button>
            )}
            {onToggleFullScreen && (
              <button
                type="button"
                onClick={onToggleFullScreen}
                aria-label={isFullScreen ? "50% view" : "Full screen"}
                title={isFullScreen ? "50% view" : "Full screen"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>50% view</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Full screen</span>
                  </>
                )}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close reviewer"
                title="Close reviewer"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {review && (
              <>
                <button
                  type="button"
                  onClick={() => setAnswersVisible((visible) => !visible)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${answersVisible ? "rotate-180" : ""}`}
                  />
                  {answersVisible ? "Hide answers" : "Show answers"}
                </button>
                <button
                  type="button"
                  title="Download reviewer as PDF"
                  onClick={() => {
                    exportStudyReviewerPdf(review, answersVisible);
                    setMessage("Reviewer PDF downloaded.");
                    window.setTimeout(() => setMessage(""), 2200);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save as PDF
                </button>
                <button
                  type="button"
                  title="Copy reviewer with formatting"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Clipboard className="h-3.5 w-3.5" />
                  )}
                  Copy
                </button>
              </>
            )}
          </div>
        </div>

        <div className="no-print mt-5 max-w-xl">
          <label
            htmlFor="gemini-api-key"
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Gemini API key
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm sm:max-w-md">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="gemini-api-key"
                type={keyVisible ? "text" : "password"}
                value={keyDraft}
                onChange={(event) => {
                  setKeyDraft(event.target.value);
                  setKeyFeedback("");
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your Gemini API key"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-10 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setKeyVisible((visible) => !visible)}
                aria-label={keyVisible ? "Hide API key" : "Show API key"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                {keyVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={saveKey}
                disabled={!keyDraft.trim()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-3.5 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Save key
              </button>
              <button
                type="button"
                onClick={testKey}
                disabled={!keyDraft.trim() || checkingKey}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {checkingKey && (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                )}
                {checkingKey ? "Checking" : "Test key"}
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={clearKey}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
          {keyFeedback && (
            <p
              role={keyFeedbackError ? "alert" : "status"}
              className={`mt-2 text-xs ${keyFeedbackError ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
            >
              {keyFeedback}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              Get API key from Google AI Studio
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="no-print mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              aria-label="Number of questions"
            >
              {[5, 10, 15, 20, 25].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as typeof difficulty)
              }
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              aria-label="Difficulty"
            >
              <option value="introductory">Introductory</option>
              <option value="standard">Standard</option>
              <option value="challenging">Challenging</option>
            </select>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading
              ? "Generating…"
              : review
                ? "Regenerate"
                : "Generate reviewer"}
          </button>
        </div>

        <details className="group no-print mt-3 max-w-2xl text-xs text-zinc-600 dark:text-zinc-400">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium hover:text-zinc-900 dark:hover:text-zinc-100">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400 transition-colors group-open:text-indigo-600 dark:group-open:text-indigo-400" />
            <span>Custom prompt & instructions (optional)</span>
          </summary>
          <div className="pt-2">
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              rows={3}
              placeholder="e.g. Focus on chapter 2, create 20 questions with challenging multiple-choice explanations, prioritize key dates and interrupt numbers..."
              className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Appended to Gemini instructions as a strict override for question
              count, topics, or difficulty.
            </p>
          </div>
        </details>

        {(hasCourseText || videoSources.length > 0) && (
          <div className="no-print mt-3.5 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Sources to include in review
              </p>
              <div className="flex items-center gap-2">
                {videoSources.length > 0 && hasCourseText && (
                  <button
                    type="button"
                    onClick={() => {
                      setIncludeCourseText(true);
                      setSelectedYoutubeUrls([...videoSources]);
                    }}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Select all
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasCourseText && (
                <button
                  type="button"
                  aria-pressed={includeCourseText}
                  onClick={() => setIncludeCourseText((prev) => !prev)}
                  className={`min-h-8 touch-manipulation rounded-lg border px-3 text-xs font-medium transition-colors ${
                    includeCourseText
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {sourcePdfLabel
                    ? `${sourcePdfLabel} / Lesson text`
                    : pdfFile || getPdfFile
                      ? "Lesson PDF / text"
                      : "Lesson text"}
                </button>
              )}
              {videoSources.map((url, index) => {
                const isSelected = selectedYoutubeUrls.includes(url);
                return (
                  <div key={url} className="inline-flex items-center">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleVideo(url)}
                      className={`min-h-8 touch-manipulation rounded-l-lg border px-3 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      Video {index + 1}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open video ${index + 1} on YouTube`}
                      title="Watch on YouTube"
                      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-r-lg border border-l-0 border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(error || message) && (
        <div className="no-print px-5 pt-4 sm:px-7">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
            >
              {message}
            </p>
          )}
        </div>
      )}

      {review ? (
        <div className="space-y-8 px-5 py-6 sm:px-7 sm:py-8">
          <div className="no-print -mt-2 flex flex-wrap items-center gap-1.5 border-b border-zinc-200/80 pb-3 dark:border-zinc-800/80">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              View:
            </span>
            <button
              type="button"
              onClick={() => setActiveReviewSection("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeReviewSection === "all"
                  ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              All sections
            </button>
            <button
              type="button"
              onClick={() => setActiveReviewSection("summary")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeReviewSection === "summary"
                  ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              Study summary
            </button>
            {review.keyPoints.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveReviewSection("ideas")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeReviewSection === "ideas"
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Key ideas ({review.keyPoints.length})
              </button>
            )}
            {review.terms.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveReviewSection("terms")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeReviewSection === "terms"
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Key terms ({review.terms.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveReviewSection("questions")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeReviewSection === "questions"
                  ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              Questions ({review.questions.length})
            </button>
          </div>

          {(activeReviewSection === "all" ||
            activeReviewSection === "summary") && (
            <article>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                Study summary
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {review.title}
              </h3>
              <div className="mt-3 max-w-4xl space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {review.summary
                  .split(/\n\n+/)
                  .filter((p) => p.trim())
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
            </article>
          )}

          {(activeReviewSection === "all" || activeReviewSection === "ideas") &&
            review.keyPoints.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Key ideas
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {review.keyPoints.map((point, index) => (
                    <li
                      key={`${index}-${point.slice(0, 24)}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300"
                    >
                      <span className="mr-2 font-bold text-indigo-600 dark:text-indigo-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {(activeReviewSection === "all" || activeReviewSection === "terms") &&
            review.terms.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Key terms
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {review.terms.map((term, index) => (
                    <article
                      key={`${index}-${term.term}`}
                      className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
                    >
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                        {term.term}
                      </h4>
                      <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {term.definition}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                        {term.source}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

          {(activeReviewSection === "all" ||
            activeReviewSection === "questions") && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Practice questions
              </h3>
              <div className="mt-3 space-y-3">
                {review.questions.map((item, index) => (
                  <article
                    key={`${index}-${item.question.slice(0, 28)}`}
                    className="break-inside-avoid rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
                          {item.question}
                        </p>
                        {item.options.length > 0 && (
                          <ol className="mt-2 list-[upper-alpha] space-y-1 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            {item.options.map((option, optionIndex) => (
                              <li key={`${optionIndex}-${option.slice(0, 20)}`}>
                                {option}
                              </li>
                            ))}
                          </ol>
                        )}
                        {answersVisible && (
                          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                              Answer:{" "}
                              <span className="font-normal">{item.answer}</span>
                            </p>
                            {item.explanation && (
                              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                {item.explanation}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                          Source: {item.source}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <p className="border-t border-zinc-200 pt-3 text-[11px] text-zinc-400 dark:border-zinc-800">
            AI-generated study aid. Verify important facts with course material.
          </p>
        </div>
      ) : (
        <div className="px-4 py-7 text-center">
          <p className="mx-auto max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Generating summary & practice questions…"
              : "Enter your Gemini API key and click Generate reviewer."}
          </p>
        </div>
      )}
    </section>
  );
}

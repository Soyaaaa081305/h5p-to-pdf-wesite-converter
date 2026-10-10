import { useRef, useState } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import {
  checkGeminiApiKey,
  generateStudyReview,
  getSavedGeminiApiKey,
  removeGeminiApiKey,
  saveGeminiApiKey,
  transcribeAuthorizedMedia,
  type TranscriptionProgress,
} from "../lib/gemini";
import type { GeneratedTranscript, StudyReview } from "../types/study";

interface Props {
  title: string;
  sourceText: string;
  pdfFile?: File;
  youtubeUrl?: string;
  youtubeUrls?: string[];
  sourceDescription?: string;
  compact?: boolean;
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

function reviewAsText(review: StudyReview): string {
  return [
    review.title,
    "",
    review.summary,
    "",
    "KEY POINTS",
    ...review.keyPoints.map((point) => `• ${point}`),
    "",
    "KEY TERMS",
    ...review.terms.map(
      (term) => `${term.term}: ${term.definition} (${term.source})`,
    ),
    "",
    "QUESTIONS AND ANSWERS",
    ...review.questions.map(
      (item, index) =>
        `${index + 1}. ${item.question}${item.options.length ? `\n${item.options.map((option, i) => `   ${String.fromCharCode(65 + i)}. ${option}`).join("\n")}` : ""}\nAnswer: ${item.answer}\nWhy: ${item.explanation}\nSource: ${item.source}`,
    ),
  ].join("\n");
}

export function StudyReviewer({
  title,
  sourceText,
  pdfFile,
  youtubeUrl,
  youtubeUrls = [],
  sourceDescription,
  compact = false,
  onTranscriptReady,
}: Props) {
  const mediaInput = useRef<HTMLInputElement>(null);
  const nextTranscriptSource = useRef<
    { name: string; youtubeUrl?: string } | undefined
  >();
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
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState(
    youtubeUrl || "",
  );
  const [review, setReview] = useState<StudyReview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [answersVisible, setAnswersVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [transcriptionError, setTranscriptionError] = useState("");

  async function generate() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const next = await generateStudyReview({
        apiKey,
        title,
        sourceText,
        questionCount,
        difficulty,
        youtubeUrl: selectedYoutubeUrl || youtubeUrl,
        pdfFile,
      });
      setReview(next);
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

  async function transcribeFile(file: File) {
    const source = nextTranscriptSource.current;
    nextTranscriptSource.current = undefined;
    setTranscriptionError("");
    setTranscriptionStatus("");
    if (!apiKey || keyDraft.trim() !== apiKey) {
      setTranscriptionError("Save your Gemini API key before transcribing.");
      return;
    }
    if (!adultConfirmed || !consented) {
      setTranscriptionError(
        "Confirm the age and data-sharing notices before sending media to Google.",
      );
      return;
    }
    setTranscribing(true);
    try {
      const text = await transcribeAuthorizedMedia({
        apiKey,
        file,
        onProgress: (progress: TranscriptionProgress) =>
          setTranscriptionStatus(progress),
      });
      onTranscriptReady?.({
        name: source?.name || `${file.name} transcript`,
        text,
        youtubeUrl: source?.youtubeUrl,
      });
      setTranscriptionStatus("");
    } catch (caught) {
      setTranscriptionError(friendlyError(caught));
      setTranscriptionStatus("");
    } finally {
      setTranscribing(false);
    }
  }

  function chooseMedia(source?: { name: string; youtubeUrl?: string }) {
    setTranscriptionError("");
    setTranscriptionStatus("");
    nextTranscriptSource.current = source;
    mediaInput.current?.click();
  }

  async function copy() {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(reviewAsText(review));
      setCopied(true);
      setMessage("Reviewer copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <section
      id="study-reviewer"
      className={`study-reviewer overflow-hidden bg-white dark:bg-zinc-900 ${
        compact
          ? "min-h-full"
          : "my-8 rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800"
      }`}
    >
      <input
        ref={mediaInput}
        type="file"
        accept="audio/*,video/*,.aac,.aiff,.flac,.m4a,.mkv,.mov,.mp3,.mp4,.oga,.ogg,.opus,.wav,.webm,.wma,.wmv"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose an authorized audio or video file to transcribe"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void transcribeFile(file);
          else nextTranscriptSource.current = undefined;
        }}
      />
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900/50 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Study guide
              </p>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                Summary & reviewer
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Build a clear summary, key terms, and practice questions from
                this material.
              </p>
            </div>
          </div>
          {review && (
            <div className="no-print flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAnswersVisible((visible) => !visible)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${answersVisible ? "rotate-180" : ""}`}
                />
                {answersVisible ? "Hide answers" : "Show answers"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 text-xs font-semibold hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                Save as PDF
              </button>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Clipboard className="h-3.5 w-3.5" />
                )}
                Copy
              </button>
            </div>
          )}
        </div>

        <div className="no-print mt-5 max-w-3xl">
          <label
            htmlFor="gemini-api-key"
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Gemini API key
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
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
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800"
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
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          {keyFeedback && (
            <p
              role={keyFeedbackError ? "alert" : "status"}
              className={`mt-2 text-xs ${keyFeedbackError ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
            >
              {keyFeedback}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
            Saved only in this browser and sent directly to Google when you test
            the key or generate a reviewer. Use a key you own and restrict it to
            the Gemini API and this site when supported. Anyone with access to
            this browser profile may be able to use it. You can{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-600 dark:text-indigo-300"
            >
              get a key in Google AI Studio
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            . The app cannot prevent charges on a Gemini project with billing
            enabled.
          </p>
          {!apiKey && !keyFeedback && (
            <p className="mt-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Save a key to enable reviewer generation.
            </p>
          )}
          {apiKey && keyDraft.trim() !== apiKey && (
            <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              Save the changed key before generating a reviewer.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end no-print">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Number of questions
            <select
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
            >
              {[5, 10, 15].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Difficulty
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as typeof difficulty)
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
            >
              <option value="introductory">Introductory</option>
              <option value="standard">Standard</option>
              <option value="challenging">Challenging</option>
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={
              !apiKey ||
              keyDraft.trim() !== apiKey ||
              !adultConfirmed ||
              !consented ||
              loading ||
              (!sourceText.trim() &&
                !pdfFile &&
                !selectedYoutubeUrl &&
                !youtubeUrl)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading
              ? "Building reviewer…"
              : review
                ? "Regenerate"
                : "Generate reviewer"}
          </button>
        </div>

        <label className="no-print mt-3 flex items-start gap-2.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={adultConfirmed}
            onChange={(event) => setAdultConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            I confirm that I am 18 or older. Google’s free Gemini API service is
            not for people under 18.
          </span>
        </label>
        <label className="no-print mt-2 flex items-start gap-2.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            I understand that{" "}
            {pdfFile
              ? "this PDF"
              : selectedYoutubeUrl || youtubeUrl
                ? "the selected video link and study text"
                : "the extracted study text"}{" "}
            is sent to Google Gemini using this key when I generate a reviewer.
            A local audio or video file I choose to transcribe is also uploaded
            to Google Gemini Files API; the app requests deletion after
            transcription, and Google automatically deletes it within 48 hours.
            If the key uses Google's unpaid service, Google may use submitted
            content and responses to improve its products, and human reviewers
            may process them. I will not send personal, confidential, or
            restricted material, and I am allowed to use and share this source.
          </span>
        </label>
        {youtubeUrls.length > 0 && (
          <label className="no-print mt-3 block max-w-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Include a course video (optional)
            <select
              value={selectedYoutubeUrl}
              onChange={(event) => setSelectedYoutubeUrl(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-normal"
            >
              <option value="">Use course text only</option>
              {youtubeUrls.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          </label>
        )}
        <section
          aria-label="Video transcription"
          className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start gap-2.5">
            <Video className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Transcribe a course video
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
                Choose a local audio or video copy you own or are allowed to
                send to Google (up to 250 MB). This app does not download
                YouTube videos.
              </p>
            </div>
          </div>
          {youtubeUrls.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {youtubeUrls.map((url, index) => (
                <li
                  key={url}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-xs font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-600 dark:text-indigo-300 dark:decoration-indigo-900"
                  >
                    Video {index + 1} · Open on YouTube
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      chooseMedia({
                        name: `${title} — video ${index + 1} transcript`,
                        youtubeUrl: url,
                      })
                    }
                    disabled={
                      !apiKey ||
                      keyDraft.trim() !== apiKey ||
                      !adultConfirmed ||
                      !consented ||
                      transcribing
                    }
                    className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    aria-label={`Choose a local copy to transcribe for video ${index + 1}`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Choose file
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => chooseMedia()}
              disabled={
                !apiKey ||
                keyDraft.trim() !== apiKey ||
                !adultConfirmed ||
                !consented ||
                transcribing
              }
              className="mt-3 inline-flex h-9 touch-manipulation items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <Upload className="h-3.5 w-3.5" /> Choose audio or video file
            </button>
          )}
          {transcriptionStatus && (
            <p
              role="status"
              className="mt-3 text-xs text-zinc-600 dark:text-zinc-300"
            >
              {transcriptionStatus}
            </p>
          )}
          {transcriptionError && (
            <p
              role="alert"
              className="mt-3 text-xs text-rose-700 dark:text-rose-300"
            >
              {transcriptionError}
            </p>
          )}
        </section>
        <p className="no-print mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
          {sourceDescription ||
            "Your imported file stays in this browser. Only the source you choose to review is sent when you generate."}
        </p>
      </div>

      {(error || message) && (
        <div className="no-print px-5 sm:px-7 pt-4">
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
        <div className="px-5 py-6 sm:px-7 sm:py-8 space-y-8">
          <article>
            <p className="text-xs uppercase tracking-[0.16em] font-bold text-indigo-600 dark:text-indigo-300">
              Study summary
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {review.title}
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {review.summary}
            </p>
          </article>

          {review.keyPoints.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Key ideas
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {review.keyPoints.map((point, index) => (
                  <li
                    key={`${index}-${point.slice(0, 24)}`}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300"
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

          {review.terms.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Key terms
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {review.terms.map((term, index) => (
                  <article
                    key={`${index}-${term.term}`}
                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4"
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

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Practice questions
              </h3>
              <p className="text-xs text-zinc-500">
                AI-generated. Check important facts against the source.
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {review.questions.map((item, index) => (
                <article
                  key={`${index}-${item.question.slice(0, 28)}`}
                  className="break-inside-avoid rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5"
                >
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
                        {item.question}
                      </p>
                      {item.options.length > 0 && (
                        <ol className="mt-2 space-y-1 pl-5 list-[upper-alpha] text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {item.options.map((option, optionIndex) => (
                            <li key={`${optionIndex}-${option.slice(0, 20)}`}>
                              {option}
                            </li>
                          ))}
                        </ol>
                      )}
                      {answersVisible && (
                        <div className="mt-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
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
          <p className="border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
            Generated study material can contain mistakes. Use the source
            content to verify answers before relying on them.
          </p>
        </div>
      ) : (
        <div className="px-5 py-8 sm:px-7 text-center">
          <p className="mx-auto max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {loading
              ? "Gemini is reading the selected material and preparing your reviewer."
              : "Choose a question count, confirm the data-sharing notice, then generate a summary and practice set."}
          </p>
        </div>
      )}
    </section>
  );
}

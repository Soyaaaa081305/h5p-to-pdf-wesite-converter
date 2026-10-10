import DOMPurify from "dompurify";
import { plainText } from "./extraction";
import type { StudyMaterial, StudyMaterialKind } from "../types/study";
import { normalizeYouTubeUrl } from "./youtube";

export const MAX_PDF_BYTES = 12 * 1024 * 1024;
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;
export const MAX_REVIEW_CHARS = 48_000;

const HTML_TAGS = [
  "p",
  "div",
  "span",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "a",
  "section",
  "article",
  "main",
  "header",
  "footer",
];

function kindOf(file: File): StudyMaterialKind | undefined {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") return "pdf";
  if (["html", "htm"].includes(extension || "") || file.type === "text/html")
    return "html";
  if (["srt", "vtt"].includes(extension || "")) return "transcript";
  if (
    ["txt", "md", "text"].includes(extension || "") ||
    file.type.startsWith("text/")
  )
    return "text";
  return undefined;
}

function transcriptText(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^WEBVTT[^\n]*\n+/i, "")
    .replace(/^NOTE(?:\s.*)?(?:\n[\s\S]*?\n\n)?/gim, "")
    .replace(/^\s*\d+\s*\n/gm, "")
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s+-->.*$/gm, "")
    .replace(/<\d{2}:\d{2}:\d{2}[.,]\d{3}>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]{1,80}\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHtmlText(safeHtml: string): string {
  const container = document.createElement("div");
  container.innerHTML = safeHtml;
  return (container.textContent || "").replace(/\s+/g, " ").trim();
}

export async function parseStudyFile(file: File): Promise<StudyMaterial> {
  const kind = kindOf(file);
  if (!kind) {
    throw new Error(
      `${file.name}: choose an H5P/ZIP, PDF, HTML, TXT, SRT, or VTT file.`,
    );
  }
  const maximum = kind === "pdf" ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
  if (file.size === 0) throw new Error(`${file.name}: the file is empty.`);
  if (file.size > maximum) {
    throw new Error(
      `${file.name}: the ${kind === "pdf" ? "PDF" : "text document"} limit is ${Math.round(maximum / 1024 / 1024)} MB.`,
    );
  }

  if (kind === "pdf") {
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (new TextDecoder().decode(signature) !== "%PDF-") {
      throw new Error(
        `${file.name}: this file does not have a valid PDF header.`,
      );
    }
    const pdfUrl = URL.createObjectURL(file);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      kind,
      size: file.size,
      text: "",
      pdfUrl,
      file,
      dispose: () => URL.revokeObjectURL(pdfUrl),
    };
  }

  const contents = await file.text();
  let html: string | undefined;
  let text: string;
  if (kind === "html") {
    html = DOMPurify.sanitize(contents, {
      ALLOWED_TAGS: HTML_TAGS,
      ALLOWED_ATTR: ["href", "title", "colspan", "rowspan"],
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    });
    text = extractHtmlText(html);
  } else if (kind === "transcript") {
    text = transcriptText(contents);
  } else {
    text = contents.replace(/\0/g, "").trim();
  }
  if (!text) throw new Error(`${file.name}: no readable text was found.`);
  if (text.length > MAX_REVIEW_CHARS) {
    text = text.slice(0, MAX_REVIEW_CHARS);
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    size: file.size,
    text,
    html,
    file,
    dispose: () => undefined,
  };
}

export function extractH5PLearningText(
  value: unknown,
  title: string,
  limit = MAX_REVIEW_CHARS,
): string {
  const textFields = new Set([
    "text",
    "title",
    "description",
    "taskDescription",
    "intro",
    "body",
    "heading",
    "caption",
    "statement",
    "label",
    "question",
    "content",
    "subTitle",
    "subtitle",
  ]);
  const blockedFields =
    /^(?:answers?|correct(?:Answers?)?|solution|feedback|explanation|distractors?|options|correctElements|copyright|file|files|path|url|src)$/i;
  const chunks: string[] = [`Course: ${title}`];
  const seen = new Set<string>();
  const stack: Array<{ value: unknown; key: string; depth: number }> = [
    { value, key: "", depth: 0 },
  ];
  let nodes = 0;
  while (
    stack.length &&
    nodes++ < 100_000 &&
    chunks.join("\n").length < limit
  ) {
    const item = stack.pop()!;
    if (item.depth > 100 || blockedFields.test(item.key)) continue;
    if (typeof item.value === "string") {
      if (!textFields.has(item.key)) continue;
      const text = plainText(item.value).replace(/\s+/g, " ").trim();
      if (text.length < 3 || seen.has(text)) continue;
      seen.add(text);
      chunks.push(text);
    } else if (Array.isArray(item.value)) {
      for (let i = item.value.length - 1; i >= 0; i--) {
        stack.push({
          value: item.value[i],
          key: item.key,
          depth: item.depth + 1,
        });
      }
    } else if (item.value && typeof item.value === "object") {
      const entries = Object.entries(item.value as Record<string, unknown>);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, child] = entries[i];
        stack.push({ value: child, key, depth: item.depth + 1 });
      }
    }
  }
  return chunks.join("\n\n").slice(0, limit);
}

export function extractH5PYouTubeUrls(value: unknown): string[] {
  const urls = new Set<string>();
  const stack: unknown[] = [value];
  let nodes = 0;
  while (stack.length && nodes++ < 100_000 && urls.size < 20) {
    const item = stack.pop();
    if (typeof item === "string") {
      const normalized = normalizeYouTubeUrl(item);
      if (normalized) urls.add(normalized);
    } else if (Array.isArray(item)) {
      stack.push(...item.slice(0, 2_000));
    } else if (item && typeof item === "object") {
      stack.push(
        ...Object.values(item as Record<string, unknown>).slice(0, 2_000),
      );
    }
  }
  return [...urls];
}

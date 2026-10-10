export function extractYouTubeId(url: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  const cleaned = url
    .replace(/&amp;/g, "&")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  const match = cleaned.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i,
  );
  if (match) return match[1];

  try {
    const parsed = new URL(
      cleaned.startsWith("http") ? cleaned : `https://${cleaned}`,
    );
    if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname.endsWith(".youtube.com")
    ) {
      const value = parsed.searchParams.get("v");
      if (value && /^[\w-]{11}$/.test(value)) return value;
    }
  } catch {
    // Invalid input is not a YouTube video URL.
  }
  return null;
}

export function normalizeYouTubeUrl(value: string): string | null {
  const id = extractYouTubeId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

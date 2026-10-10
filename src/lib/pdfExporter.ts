import { jsPDF } from "jspdf";
import type { AnswerItem, H5PPackage } from "../types/h5p";
import { resolveAsset } from "./h5pParser";
import { answerText, extractNode, plainText, statusLabel } from "./extraction";

const W = 1920,
  H = 1080;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function canvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth = 1,
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("Image load timed out."));
    }, 10000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Image unavailable."));
    };
    img.src = src;
  });
}

function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const result: string[] = [];
  for (const paragraph of (text || "").split("\n")) {
    let line = "";
    for (const token of paragraph.split(/(\s+)/)) {
      if (line && ctx.measureText(line + token).width > width) {
        result.push(line.trimEnd());
        line = "";
      }
      if (!line && /^\s+$/.test(token)) continue;
      for (const char of Array.from(token)) {
        if (line && ctx.measureText(line + char).width > width) {
          result.push(line);
          line = "";
        }
        line += char;
      }
    }
    result.push(line.trimEnd());
  }
  return result;
}

const filename = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .slice(0, 100) || "H5P";

export async function renderSlideToCanvas(
  slide: any,
  slideIndex: number,
  assets: Map<string, string>,
  globalBackground?: any,
): Promise<HTMLCanvasElement> {
  const c = canvas(),
    ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const bg = slide.slideBackgroundSelector || globalBackground;
  if (/^#[0-9a-f]{3,8}$/i.test(bg?.fillSlideBackground || "")) {
    ctx.fillStyle = bg.fillSlideBackground;
    ctx.fillRect(0, 0, W, H);
  }
  const background = resolveAsset(bg?.imageSlideBackground?.path, assets);
  if (background) {
    try {
      ctx.drawImage(await loadImage(background), 0, 0, W, H);
    } catch {
      /* Preserve other slide elements. */
    }
  }
  for (const el of Array.isArray(slide.elements) ? slide.elements : []) {
    const action = el.action;
    if (!action || typeof action.library !== "string") continue;
    const [library, version] = action.library.split(" "),
      p = action.params || {};
    const x = (Math.max(0, Number(el.x) || 0) * W) / 100,
      y = (Math.max(0, Number(el.y) || 0) * H) / 100;
    const width = (Math.max(1, Number(el.width) || 100) * W) / 100,
      height = (Math.max(1, Number(el.height) || 100) * H) / 100;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    const src =
      library === "H5P.Image" ? resolveAsset(p.file?.path, assets) : undefined;
    if (src) {
      try {
        ctx.drawImage(await loadImage(src), x, y, width, height);
      } catch {
        /* No remote fallback. */
      }
    } else {
      const answers = extractNode({
        library,
        version,
        params: p,
        path: "$",
        location: `Slide ${slideIndex + 1}`,
      });
      const text = answers.length
        ? answers.map((a) => `${a.prompt}\n${answerText(a)}`).join("\n")
        : plainText(p.text || p.title);
      ctx.fillStyle = "#18181b";
      ctx.font = "24px sans-serif";
      lines(ctx, text, Math.max(1, width - 16)).forEach((line, i) =>
        ctx.fillText(line, x + 8, y + 28 + i * 31),
      );
    }
    ctx.restore();
  }
  return c;
}

class Pages {
  doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [W, H],
    hotfixes: ["px_scaling"],
  });
  page = canvas();
  ctx = this.page.getContext("2d")!;
  y = 0;
  count = 0;
  dirty = false;
  isAnswerSection = false;
  currentModuleTitle = "";

  constructor() {
    this.reset();
  }

  reset(isAnswerPage = this.isAnswerSection) {
    this.ctx.fillStyle = isAnswerPage ? "#f8fafc" : "#ffffff";
    this.ctx.fillRect(0, 0, W, H);
    this.dirty = false;

    if (isAnswerPage) {
      this.ctx.save();
      // Top header banner
      drawRoundRect(this.ctx, 90, 32, 220, 32, 8, "#ecfdf5", "#a7f3d0", 1);
      this.ctx.fillStyle = "#065f46";
      this.ctx.font = "bold 13px sans-serif";
      this.ctx.fillText("✓ STUDY GUIDE & SOLUTIONS", 102, 53);

      if (this.currentModuleTitle) {
        this.ctx.fillStyle = "#0f172a";
        this.ctx.font = "bold 18px sans-serif";
        const titleText =
          this.currentModuleTitle.length > 80
            ? `${this.currentModuleTitle.slice(0, 77)}...`
            : this.currentModuleTitle;
        this.ctx.fillText(titleText, 325, 54);
      }

      // Top divider line
      this.ctx.strokeStyle = "#e2e8f0";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(90, 76);
      this.ctx.lineTo(W - 90, 76);
      this.ctx.stroke();

      // Bottom footer bar
      this.ctx.beginPath();
      this.ctx.moveTo(90, H - 45);
      this.ctx.lineTo(W - 90, H - 45);
      this.ctx.stroke();

      this.ctx.fillStyle = "#94a3b8";
      this.ctx.font = "13px sans-serif";
      this.ctx.fillText(
        "H5P to PDF Converter • Verified Solutions",
        90,
        H - 24,
      );

      this.ctx.restore();
      this.y = 100;
    } else {
      this.y = 90;
    }
  }

  startAnswerSection(title?: string) {
    if (title) this.currentModuleTitle = title;
    this.flush();
    this.isAnswerSection = true;
    this.reset(true);
  }

  ensureAnswerSection() {
    if (!this.isAnswerSection) {
      this.startAnswerSection(this.currentModuleTitle);
    }
  }

  imagePage(c: HTMLCanvasElement) {
    if (this.count++) this.doc.addPage([W, H], "landscape");
    this.doc.addImage(
      c.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      W,
      H,
      undefined,
      "FAST",
    );
  }

  flush() {
    if (this.dirty) {
      this.imagePage(this.page);
      this.reset(this.isAnswerSection);
    }
  }

  text(value: string, heading = false, answer = false) {
    this.ctx.font = `${heading ? "bold 28" : "22"}px sans-serif`;
    const rows = lines(this.ctx, value, W - 180);
    for (const line of rows) {
      if (this.y > H - 80) {
        this.flush();
        this.ctx.font = `${heading ? "bold 28" : "22"}px sans-serif`;
      }
      if (answer) {
        drawRoundRect(
          this.ctx,
          80,
          this.y - 24,
          W - 160,
          32,
          6,
          "#ecfdf5",
          "#a7f3d0",
          1,
        );
      }
      this.ctx.fillStyle = answer ? "#065f46" : heading ? "#0f172a" : "#334155";
      this.ctx.fillText(line, 90, this.y);
      this.y += heading ? 38 : 32;
      this.dirty = true;
    }
    this.y += 14;
  }

  async answer(a: AnswerItem, assets: Map<string, string>) {
    this.ensureAnswerSection();

    const cardX = 90;
    const cardW = W - 180; // 1740px
    const pad = 20;
    const innerW = cardW - pad * 2; // 1700px
    const isExtracted = a.status === "extracted";

    // 1. Measure Question Prompt lines
    this.ctx.font = "bold 16px sans-serif";
    const promptText = (a.prompt || "").trim();
    const promptLines = promptText ? lines(this.ctx, promptText, innerW) : [];
    const promptH = promptLines.length ? 18 + promptLines.length * 24 + 10 : 0;

    // 2. Measure Answer Parts
    const parts = a.parts || [];
    const isMultiPart = parts.length > 3;

    interface PartLine {
      label: string;
      value: string;
      targetText?: string;
      images: string[];
    }
    const partData: PartLine[] = [];
    for (const p of parts) {
      const val =
        p.values.join(" / ") ||
        (!p.images?.length
          ? "No statement or question authored in module"
          : "");
      let targetText: string | undefined;
      if (p.target) {
        targetText = `Drop position: ${p.target.x.toFixed(1)}% across, ${p.target.y.toFixed(1)}% down`;
      }
      partData.push({
        label: p.label || "Answer",
        value: val,
        targetText,
        images: p.images || [],
      });
    }

    // Measure solution box height
    let solutionBoxH = 26; // label "VERIFIED SOLUTION"
    this.ctx.font = "bold 15px sans-serif";
    if (isMultiPart) {
      const rowCount = Math.ceil(partData.length / 2);
      solutionBoxH += rowCount * 26 + 14;
    } else {
      for (const p of partData) {
        const full = `${p.label}: ${p.value}`;
        const pLines = lines(this.ctx, full, innerW - 24);
        solutionBoxH += pLines.length * 24 + (p.targetText ? 18 : 0) + 8;
      }
      solutionBoxH += 10;
    }

    // Check images height
    const loadedImgs: { img: HTMLImageElement; w: number; h: number }[] = [];
    for (const p of partData) {
      for (const path of p.images) {
        const src = resolveAsset(path, assets);
        if (!src) continue;
        try {
          const img = await loadImage(src);
          const scale = Math.min(280 / img.width, 130 / img.height);
          loadedImgs.push({ img, w: img.width * scale, h: img.height * scale });
          solutionBoxH += img.height * scale + 12;
        } catch {
          // ignore
        }
      }
    }

    // Explanation height
    let expH = 0;
    let expLines: string[] = [];
    if (a.explanation) {
      this.ctx.font = "14px sans-serif";
      expLines = lines(this.ctx, `Note: ${a.explanation}`, innerW - 20);
      expH = expLines.length * 20 + 14;
    }

    const totalCardH =
      pad + 30 + promptH + solutionBoxH + (expH ? expH + 10 : 0) + pad;
    const maxY = H - 65; // bottom footer margin

    // Check if we need to paginate to a new page
    if (this.y + totalCardH > maxY) {
      if (this.y > 115) {
        this.flush();
      }
    }

    // If totalCardH > (maxY - 100), card exceeds an entire page (stress test fallback)
    if (totalCardH > maxY - 100) {
      this.renderGiantCard(a, partData);
      return;
    }

    // Draw Card Container
    const startY = this.y;
    drawRoundRect(
      this.ctx,
      cardX,
      startY,
      cardW,
      totalCardH,
      14,
      "#ffffff",
      "#e2e8f0",
      1.5,
    );

    let curY = startY + pad;

    // Header Row: Location Pill + Status Pill
    this.ctx.save();
    const locText = a.location || "Activity";
    this.ctx.font = "bold 11px monospace";
    const locW = this.ctx.measureText(locText).width + 16;
    drawRoundRect(
      this.ctx,
      cardX + pad,
      curY,
      locW,
      24,
      6,
      "#f1f5f9",
      "#cbd5e1",
      1,
    );
    this.ctx.fillStyle = "#334155";
    this.ctx.fillText(locText, cardX + pad + 8, curY + 16);

    let nextX = cardX + pad + locW + 8;
    if (a.library) {
      const libText = a.library.replace(/^H5P\./, "");
      this.ctx.font = "10px monospace";
      const libW = this.ctx.measureText(libText).width + 12;
      drawRoundRect(
        this.ctx,
        nextX,
        curY,
        libW,
        24,
        6,
        "#f8fafc",
        "#e2e8f0",
        1,
      );
      this.ctx.fillStyle = "#64748b";
      this.ctx.fillText(libText, nextX + 6, curY + 16);
    }

    const statText = isExtracted
      ? `✓ ${statusLabel[a.status]}`
      : `• ${statusLabel[a.status]}`;
    this.ctx.font = "bold 11px sans-serif";
    const statW = this.ctx.measureText(statText).width + 18;
    const statX = cardX + cardW - pad - statW;
    drawRoundRect(
      this.ctx,
      statX,
      curY,
      statW,
      24,
      12,
      isExtracted ? "#ecfdf5" : "#fffbeb",
      isExtracted ? "#a7f3d0" : "#fde68a",
      1,
    );
    this.ctx.fillStyle = isExtracted ? "#065f46" : "#92400e";
    this.ctx.fillText(statText, statX + 9, curY + 16);
    this.ctx.restore();

    curY += 32;

    // Question Prompt
    if (promptLines.length) {
      this.ctx.save();
      this.ctx.fillStyle = "#64748b";
      this.ctx.font = "bold 10px monospace";
      this.ctx.fillText("QUESTION / TASK", cardX + pad, curY + 8);
      curY += 16;

      this.ctx.fillStyle = "#0f172a";
      this.ctx.font = "bold 15px sans-serif";
      for (const line of promptLines) {
        this.ctx.fillText(line, cardX + pad, curY + 15);
        curY += 24;
      }
      this.ctx.restore();
      curY += 6;
    }

    // Solution Box
    const solBoxY = curY;
    drawRoundRect(
      this.ctx,
      cardX + pad,
      solBoxY,
      innerW,
      solutionBoxH,
      10,
      isExtracted ? "#f0fdf4" : "#f8fafc",
      isExtracted ? "#bbf7d0" : "#e2e8f0",
      1,
    );

    this.ctx.save();
    this.ctx.fillStyle = isExtracted ? "#15803d" : "#64748b";
    this.ctx.font = "bold 10px monospace";
    this.ctx.fillText("VERIFIED SOLUTION", cardX + pad + 12, solBoxY + 16);

    let solContentY = solBoxY + 34;

    if (isMultiPart) {
      const half = Math.ceil(partData.length / 2);
      const col1 = partData.slice(0, half);
      const col2 = partData.slice(half);

      const col1X = cardX + pad + 14;
      const col2X = cardX + pad + innerW / 2 + 10;

      for (let r = 0; r < half; r++) {
        if (col1[r]) {
          const item = col1[r];
          this.ctx.fillStyle = isExtracted ? "#166534" : "#334155";
          this.ctx.font = "bold 14px sans-serif";
          this.ctx.fillText(`${item.label}: `, col1X, solContentY + r * 26);
          const labelW = this.ctx.measureText(`${item.label}: `).width;
          this.ctx.font = "14px sans-serif";
          this.ctx.fillText(item.value, col1X + labelW, solContentY + r * 26);
        }
        if (col2[r]) {
          const item = col2[r];
          this.ctx.fillStyle = isExtracted ? "#166534" : "#334155";
          this.ctx.font = "bold 14px sans-serif";
          this.ctx.fillText(`${item.label}: `, col2X, solContentY + r * 26);
          const labelW = this.ctx.measureText(`${item.label}: `).width;
          this.ctx.font = "14px sans-serif";
          this.ctx.fillText(item.value, col2X + labelW, solContentY + r * 26);
        }
      }
      solContentY += half * 26;
    } else {
      for (const item of partData) {
        this.ctx.fillStyle = isExtracted ? "#166534" : "#334155";
        this.ctx.font = "bold 15px sans-serif";
        const lbl = `${item.label}: `;
        this.ctx.fillText(lbl, cardX + pad + 12, solContentY);
        const lblW = this.ctx.measureText(lbl).width;

        this.ctx.font = "15px sans-serif";
        const valLines = lines(this.ctx, item.value, innerW - 24 - lblW);
        if (valLines.length) {
          this.ctx.fillText(valLines[0], cardX + pad + 12 + lblW, solContentY);
          for (let vi = 1; vi < valLines.length; vi++) {
            solContentY += 24;
            this.ctx.fillText(valLines[vi], cardX + pad + 12, solContentY);
          }
        }
        if (item.targetText) {
          solContentY += 20;
          this.ctx.font = "12px monospace";
          this.ctx.fillStyle = "#64748b";
          this.ctx.fillText(item.targetText, cardX + pad + 12, solContentY);
        }
        solContentY += 24;
      }
    }

    for (const imgItem of loadedImgs) {
      this.ctx.drawImage(
        imgItem.img,
        cardX + pad + 12,
        solContentY,
        imgItem.w,
        imgItem.h,
      );
      solContentY += imgItem.h + 10;
    }

    this.ctx.restore();
    curY += solutionBoxH + 10;

    // Explanation Note
    if (expLines.length) {
      drawRoundRect(
        this.ctx,
        cardX + pad,
        curY,
        innerW,
        expH,
        8,
        "#f8fafc",
        "#e2e8f0",
        1,
      );
      this.ctx.save();
      this.ctx.fillStyle = "#475569";
      this.ctx.font = "13px sans-serif";
      let ey = curY + 15;
      for (const el of expLines) {
        this.ctx.fillText(el, cardX + pad + 10, ey);
        ey += 20;
      }
      this.ctx.restore();
      curY += expH;
    }

    this.y = startY + totalCardH + 16;
    this.dirty = true;
  }

  renderGiantCard(a: AnswerItem, parts: { label: string; value: string }[]) {
    this.text(`${a.location} · ${statusLabel[a.status]}`, true);
    if (a.prompt) this.text(a.prompt);
    for (const p of parts) {
      this.text(`${p.label}: ${p.value}`, false, true);
    }
  }

  toBlob(): Blob {
    this.flush();
    if (!this.count) {
      this.text("No exportable package content.");
      this.flush();
    }
    const blob = this.doc.output("blob");
    this.page.width = 0;
    this.page.height = 0;
    return blob;
  }

  save(name: string) {
    const blob = this.toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename(name)}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function exportAnswerKey(
  packages: H5PPackage[],
  selected?: AnswerItem[],
  signal?: AbortSignal,
) {
  const pages = new Pages();
  for (const p of packages) {
    signal?.throwIfAborted();
    pages.startAnswerSection(p.metadata.title || p.fileName);
    const answers = selected
      ? selected.filter((a) => p.report.answers.includes(a))
      : p.report.answers;
    if (!answers.length) pages.text("No matching stored answer key.");
    for (const a of answers) {
      signal?.throwIfAborted();
      await pages.answer(a, p.assetMap);
      await tick();
    }
  }
  signal?.throwIfAborted();
  pages.save("H5P Answer Key");
}

export async function renderPackageToPdfBlob(
  packages: H5PPackage[],
  onProgress?: (current: number, total: number, name: string) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const pages = new Pages();
  let current = 0;
  const total = packages.reduce((n, p) => n + p.report.nodes.length, 0);

  for (const pkg of packages) {
    pages.currentModuleTitle = pkg.metadata.title || pkg.fileName;
    const presentations = pkg.report.nodes.filter(
      (n) => n.library === "H5P.CoursePresentation",
    );
    const hasPresentation = presentations.length > 0;

    // Only render an initial text title if this package does NOT have presentation slides
    if (!hasPresentation) {
      pages.text(pkg.metadata.title || pkg.fileName, true);
    }

    for (const node of pkg.report.nodes) {
      const inSlide = presentations.some((p) =>
        node.path.startsWith(`${p.path}.params.presentation.slides`),
      );
      signal?.throwIfAborted();
      onProgress?.(++current, total, pkg.metadata.title || pkg.fileName);

      if (node.library === "H5P.CoursePresentation") {
        const slides = node.params.presentation?.slides;
        if (Array.isArray(slides)) {
          for (let i = 0; i < slides.length; i++) {
            signal?.throwIfAborted();
            pages.flush();
            const c = await renderSlideToCanvas(
              slides[i],
              i,
              pkg.assetMap,
              node.params.presentation?.globalBackgroundSelector,
            );
            pages.imagePage(c);
            c.width = 0;
            await tick();
          }
        }
      }

      if (
        ["H5P.Text", "H5P.AdvancedText", "H5P.Table"].includes(node.library) &&
        !node.path.includes(".task.elements") &&
        !inSlide
      ) {
        const text = plainText(node.params.text || node.params.table);
        if (text) {
          pages.text(node.location, true);
          pages.text(text);
        }
      }

      if (
        node.library === "H5P.Image" &&
        !node.path.includes(".task.elements") &&
        !inSlide
      ) {
        const src = resolveAsset(node.params.file?.path, pkg.assetMap);
        if (src) {
          try {
            const img = await loadImage(src);
            pages.flush();
            const c = canvas(),
              ctx = c.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, W, H);
            const scale = Math.min(W / img.width, H / img.height);
            ctx.drawImage(
              img,
              (W - img.width * scale) / 2,
              (H - img.height * scale) / 2,
              img.width * scale,
              img.height * scale,
            );
            pages.imagePage(c);
            c.width = 0;
          } catch {
            pages.text("Package image unavailable.");
          }
        }
      }

      // Check if this node has extracted answers
      const matchingAnswers = pkg.report.answers.filter(
        (a) => a.sourcePath === node.path,
      );
      for (const a of matchingAnswers) {
        await pages.answer(a, pkg.assetMap);
      }
      await tick();
    }

    for (const note of pkg.report.videoNotes) {
      pages.ensureAnswerSection();
      pages.text(
        `${note.location} · ${note.kind === "transcript" ? "Transcript excerpts" : "Activity-based video notes"}`,
        true,
      );
      pages.text(note.text);
    }

    for (const warning of pkg.report.warnings) {
      pages.ensureAnswerSection();
      pages.text(warning);
    }

    pages.flush();
  }

  signal?.throwIfAborted();
  return pages.toBlob();
}

export async function exportPackageToPdfFile(
  pkg: H5PPackage,
  signal?: AbortSignal,
): Promise<File> {
  const blob = await renderPackageToPdfBlob([pkg], undefined, signal);
  const title = filename(pkg.metadata.title || pkg.fileName || "Course Module");
  return new File([blob], `${title}.pdf`, { type: "application/pdf" });
}

async function exportPackages(
  packages: H5PPackage[],
  onProgress?: (current: number, total: number, name: string) => void,
  signal?: AbortSignal,
) {
  const blob = await renderPackageToPdfBlob(packages, onProgress, signal);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename(
    packages.length === 1
      ? packages[0].metadata.title || packages[0].fileName
      : "Course All Modules Bundle",
  )}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportSlidesToPdf = (
  pkg: H5PPackage,
  onProgress?: (current: number, total: number, name: string) => void,
  signal?: AbortSignal,
) => exportPackages([pkg], onProgress, signal);

export const exportBatchToPdf = exportPackages;

export async function copySlideImageToClipboard(
  slide: any,
  slideIndex: number,
  assetMap: Map<string, string>,
) {
  const c = await renderSlideToCanvas(slide, slideIndex, assetMap);
  const blob = await new Promise<Blob | null>((resolve) =>
    c.toBlob(resolve, "image/png"),
  );
  c.width = 0;
  if (!blob || !navigator.clipboard?.write)
    throw new Error("Image clipboard is unavailable.");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export async function downloadSlideAsPng(
  slide: any,
  slideIndex: number,
  assetMap: Map<string, string>,
  prefixName?: string,
) {
  const c = await renderSlideToCanvas(slide, slideIndex, assetMap);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${filename(prefixName || "slide")}-${slideIndex + 1}.png`;
  a.click();
  c.width = 0;
}

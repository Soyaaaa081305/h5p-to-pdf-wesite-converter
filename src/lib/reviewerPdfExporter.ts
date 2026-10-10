import { jsPDF } from "jspdf";
import type { StudyReview } from "../types/study";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "study-reviewer"
  );
}

export function exportStudyReviewerPdf(
  review: StudyReview,
  answersVisible = true,
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 50;

  let y = margin;

  function checkAddPage(requiredSpace: number) {
    if (y + requiredSpace > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  }

  // --- Header ---
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.roundedRect(margin, y, contentWidth, 36, 6, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("STUDY REVIEWER", margin + 14, y + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(212, 212, 216);
  doc.text(
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    pageWidth - margin - 14,
    y + 22,
    { align: "right" },
  );

  y += 50;

  // --- Title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  const titleLines = doc.splitTextToSize(review.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 10;

  // --- Summary ---
  if (review.summary) {
    checkAddPage(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("STUDY SUMMARY", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85); // slate-700
    const summaryLines = doc.splitTextToSize(review.summary, contentWidth);
    for (const line of summaryLines) {
      checkAddPage(15);
      doc.text(line, margin, y);
      y += 15;
    }
    y += 14;
  }

  // --- Key Ideas ---
  if (review.keyPoints && review.keyPoints.length > 0) {
    checkAddPage(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text("KEY IDEAS", margin, y);
    y += 16;

    review.keyPoints.forEach((point, index) => {
      checkAddPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      const numLabel = `${String(index + 1).padStart(2, "0")}. `;
      doc.text(numLabel, margin + 4, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const pointLines = doc.splitTextToSize(point, contentWidth - 28);
      doc.text(pointLines, margin + 26, y);
      y += pointLines.length * 14 + 6;
    });
    y += 12;
  }

  // --- Key Terms ---
  if (review.terms && review.terms.length > 0) {
    checkAddPage(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text("KEY TERMS", margin, y);
    y += 16;

    for (const term of review.terms) {
      checkAddPage(36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(term.term, margin + 6, y);
      y += 13;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const defLines = doc.splitTextToSize(term.definition, contentWidth - 12);
      doc.text(defLines, margin + 6, y);
      y += defLines.length * 13;

      if (term.source) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Source: ${term.source}`, margin + 6, y);
        y += 12;
      }
      y += 5;
    }
    y += 12;
  }

  // --- Practice Questions ---
  if (review.questions && review.questions.length > 0) {
    checkAddPage(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(
      answersVisible
        ? "PRACTICE QUESTIONS (WITH ANSWERS)"
        : "PRACTICE QUESTIONS",
      margin,
      y,
    );
    y += 18;

    review.questions.forEach((item, index) => {
      checkAddPage(40);

      // Question header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const qNum = `${index + 1}. `;
      doc.text(qNum, margin, y);

      const qLines = doc.splitTextToSize(item.question, contentWidth - 20);
      doc.text(qLines, margin + 18, y);
      y += qLines.length * 14 + 4;

      // Options if any
      if (item.options && item.options.length > 0) {
        item.options.forEach((opt, optIndex) => {
          checkAddPage(16);
          const optLabel = `   ${String.fromCharCode(65 + optIndex)}. `;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(optLabel, margin + 18, y);

          doc.setFont("helvetica", "normal");
          const optLines = doc.splitTextToSize(opt, contentWidth - 55);
          doc.text(optLines, margin + 42, y);
          y += optLines.length * 13 + 3;
        });
      }

      // Answers if visible
      if (answersVisible) {
        checkAddPage(30);
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(22, 101, 52); // emerald-800
        doc.text(`Answer: ${item.answer}`, margin + 20, y + 4);
        y += 16;

        if (item.explanation) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          const expLines = doc.splitTextToSize(
            `Why: ${item.explanation}`,
            contentWidth - 40,
          );
          for (const line of expLines) {
            checkAddPage(12);
            doc.text(line, margin + 20, y);
            y += 12;
          }
        }
      }

      if (item.source) {
        checkAddPage(12);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Source: ${item.source}`, margin + 20, y + 2);
        y += 14;
      }

      y += 8;
    });
  }

  // --- Add footers on all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      "AI-generated study aid. Verify important facts with course material.",
      margin,
      pageHeight - 25,
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 25,
      {
        align: "right",
      },
    );
  }

  // Trigger download
  doc.save(`${slugify(review.title || "study-reviewer")}-reviewer.pdf`);
}

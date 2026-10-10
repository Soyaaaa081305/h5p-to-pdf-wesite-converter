export type StudyMaterialKind =
  "pdf" | "html" | "text" | "transcript" | "youtube";

export interface StudyMaterial {
  id: string;
  name: string;
  kind: StudyMaterialKind;
  size: number;
  text: string;
  html?: string;
  pdfUrl?: string;
  youtubeUrl?: string;
  sourceUrl?: string;
  file?: File;
  dispose: () => void;
}

export interface GeneratedTranscript {
  name: string;
  text: string;
  youtubeUrl?: string;
}

export interface ReviewerQuestion {
  type: "multiple_choice" | "short_answer" | "true_false" | "flashcard";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  source: string;
}

export interface StudyReview {
  title: string;
  summary: string;
  keyPoints: string[];
  terms: Array<{ term: string; definition: string; source: string }>;
  questions: ReviewerQuestion[];
}

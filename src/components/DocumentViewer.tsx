import type { H5PPackage } from "../types/h5p";
import { ElementDispatcher } from "./renderers/ElementDispatcher";
import { StudyReviewerDock } from "./StudyReviewerDock";
import {
  extractH5PLearningText,
  extractH5PYouTubeUrls,
} from "../lib/studyMaterials";
import type { GeneratedTranscript } from "../types/study";
export function DocumentViewer({
  pkg,
  onTranscriptReady,
}: {
  pkg: H5PPackage;
  onTranscriptReady?: (transcript: GeneratedTranscript) => void;
}) {
  const title = pkg.metadata.title || pkg.fileName;
  const transcriptText = pkg.report.videoNotes
    .filter(
      (note) =>
        note.kind === "transcript" &&
        !note.text.startsWith("No packaged transcript"),
    )
    .map((note) => `${note.location}\n${note.text}`)
    .join("\n\n");
  const sourceText = [
    extractH5PLearningText(pkg.content, title),
    transcriptText ? `Packaged video transcripts:\n${transcriptText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const youtubeUrls = extractH5PYouTubeUrls(pkg.content);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
      <ElementDispatcher
        action={{
          library:
            pkg.mainLibrary +
            (pkg.report.nodes[0]?.version
              ? " " + pkg.report.nodes[0].version
              : ""),
          params: pkg.content,
        }}
        assetMap={pkg.assetMap}
      />
      {![
        "H5P.InteractiveBook",
        "H5P.Column",
        "H5P.CoursePresentation",
        "H5P.QuestionSet",
        "H5P.InteractiveVideo",
      ].includes(pkg.mainLibrary) &&
        pkg.report.nodes
          .slice(1)
          .filter((n) => !["H5P.Column", "H5P.QuestionSet"].includes(n.library))
          .map((n) => (
            <section key={n.path} className="my-4">
              <p className="text-xs text-zinc-500">{n.location}</p>
              <ElementDispatcher
                action={{
                  library: n.library + (n.version ? " " + n.version : ""),
                  params: n.params,
                }}
                assetMap={pkg.assetMap}
              />
            </section>
          ))}
      <StudyReviewerDock
        title={title}
        sourceText={sourceText}
        youtubeUrls={youtubeUrls}
        onTranscriptReady={onTranscriptReady}
        sourceDescription="Only extracted lesson text and any video you select are sent to Gemini. The H5P archive and its stored answer key stay in this browser."
      />
    </div>
  );
}

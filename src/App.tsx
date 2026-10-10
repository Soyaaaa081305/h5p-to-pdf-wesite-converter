import { useEffect, useRef, useState } from "react";
import type { H5PPackage } from "./types/h5p";
import type { GeneratedTranscript, StudyMaterial } from "./types/study";
import { parseH5PFile } from "./lib/h5pParser";
import { parseStudyFile } from "./lib/studyMaterials";
import { Header } from "./components/Header";
import { DropZone } from "./components/DropZone";
import { Toolbar } from "./components/Toolbar";
import { DocumentViewer } from "./components/DocumentViewer";
import { StudyMaterialViewer } from "./components/StudyMaterialViewer";
import { SourceManager } from "./components/SourceManager";
import { PolicyPage } from "./components/PolicyPage";
import { SiteFooter } from "./components/SiteFooter";
import { PrankLanding } from "./components/PrankLanding";
import { GITHUB_REPOSITORY } from "./lib/links";

type LoadedSource =
  | { id: string; type: "h5p"; title: string; package: H5PPackage }
  | { id: string; type: "material"; title: string; material: StudyMaterial };

function disposeSource(source: LoadedSource) {
  if (source.type === "h5p") source.package.dispose();
  else source.material.dispose();
}

function StudyReviewerApp() {
  const [sources, setSources] = useState<LoadedSource[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController>();
  const current = useRef(sources);
  current.current = sources;

  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      current.current.forEach(disposeSource);
    },
    [],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (sources.length > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sources.length]);

  async function importFiles(files: File[]) {
    if (controller.current || !files.length) return;
    const importGeneration = generation.current;
    const job = new AbortController();
    controller.current = job;
    setError(null);
    const successes: LoadedSource[] = [];
    const failures: string[] = [];
    let cancelled = false;

    try {
      for (let i = 0; i < files.length; i++) {
        job.signal.throwIfAborted();
        const file = files[i];
        setLoading(`Reading source ${i + 1} of ${files.length}: ${file.name}`);
        try {
          const extension = file.name.split(".").pop()?.toLowerCase();
          if (extension === "h5p" || extension === "zip") {
            const pkg = await parseH5PFile(file, undefined, job.signal);
            successes.push({
              id: crypto.randomUUID(),
              type: "h5p",
              title: pkg.metadata.title || pkg.fileName,
              package: pkg,
            });
          } else {
            const material = await parseStudyFile(file);
            successes.push({
              id: material.id,
              type: "material",
              title: material.name,
              material,
            });
          }
        } catch (caught) {
          if (job.signal.aborted) throw caught;
          failures.push(
            `${file.name}: ${caught instanceof Error ? caught.message : "could not read this file."}`,
          );
        }
      }
    } catch {
      cancelled = true;
      failures.push("Import cancelled. Completed imports were kept.");
    } finally {
      if (generation.current !== importGeneration) {
        successes.forEach(disposeSource);
        controller.current = undefined;
        return;
      }
      if (successes.length) {
        setSources((previous) => [...previous, ...successes]);
        setActiveId(successes[0].id);
      }
      setError(
        failures.length
          ? cancelled
            ? failures.join(" ")
            : `${failures.length} file(s) could not be imported. ${failures.join(" ")}`
          : null,
      );
      setLoading("");
      controller.current = undefined;
    }
  }

  const selected =
    sources.find((source) => source.id === activeId) ?? sources[0];
  const packageSources = sources.filter(
    (source): source is Extract<LoadedSource, { type: "h5p" }> =>
      source.type === "h5p",
  );
  const packages = packageSources.map((source) => source.package);

  function removeSource(id: string) {
    const index = sources.findIndex((source) => source.id === id);
    const target = sources[index];
    if (!target) return;
    disposeSource(target);
    const remaining = sources.filter((source) => source.id !== id);
    setSources(remaining);
    if (selected?.id === id) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id);
    }
  }

  function reset() {
    generation.current++;
    controller.current?.abort();
    setLoading("");
    sources.forEach(disposeSource);
    setSources([]);
    setActiveId(undefined);
    setError(null);
  }

  function addTranscript(transcript: GeneratedTranscript) {
    const material: StudyMaterial = {
      id: crypto.randomUUID(),
      name: transcript.name,
      kind: "transcript",
      size: new TextEncoder().encode(transcript.text).byteLength,
      text: transcript.text,
      sourceUrl: transcript.youtubeUrl,
      dispose: () => undefined,
    };
    setSources((previous) => [
      ...previous,
      {
        id: material.id,
        type: "material",
        title: material.name,
        material,
      },
    ]);
    setActiveId(material.id);
    setError(null);
  }

  const pathname = window.location.pathname.replace(/\/$/, "");
  if (pathname === "/soya") {
    window.location.replace(GITHUB_REPOSITORY);
    return null;
  }
  const policyPage =
    pathname === "/terms" || pathname === "/privacy"
      ? (pathname.slice(1) as "terms" | "privacy")
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      {policyPage ? (
        <PolicyPage page={policyPage} />
      ) : (
        <main className="flex flex-1 flex-col">
          {loading && (
            <div role="status" className="p-3 text-center text-sm">
              {loading}{" "}
              <button
                className="underline ml-3"
                onClick={() => controller.current?.abort()}
              >
                Cancel import
              </button>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="p-3 text-center text-sm text-amber-700 dark:text-amber-400"
            >
              {error}
            </p>
          )}
          <SourceManager
            sources={sources.map((source) => ({
              id: source.id,
              title: source.title,
              kind: source.type === "h5p" ? "H5P" : source.material.kind,
            }))}
            selectedId={selected?.id}
            onSelect={setActiveId}
            onRemove={removeSource}
            onReset={reset}
          />
          {selected?.type === "h5p" ? (
            <>
              <Toolbar
                packages={packages}
                activePkgIndex={packageSources.findIndex(
                  (source) => source.id === selected.id,
                )}
                onSelectPackage={(index) =>
                  setActiveId(packageSources[index]?.id)
                }
                onRemovePackage={(index) =>
                  packageSources[index] &&
                  removeSource(packageSources[index].id)
                }
                onAddFiles={importFiles}
                onResetAll={reset}
              />
              <DocumentViewer
                key={selected.id}
                pkg={selected.package}
                onTranscriptReady={addTranscript}
              />
            </>
          ) : selected?.type === "material" ? (
            <StudyMaterialViewer
              key={selected.id}
              material={selected.material}
              onRemove={() => removeSource(selected.id)}
              onAddFiles={importFiles}
              onTranscriptReady={addTranscript}
            />
          ) : (
            <DropZone
              onFilesLoaded={importFiles}
              isLoading={!!loading}
              loadingMessage={loading}
            />
          )}
        </main>
      )}
      <SiteFooter />
    </div>
  );
}

function isGitHubPagesNotice() {
  return (
    import.meta.env.VITE_DEPLOY_TARGET === "github-pages" ||
    window.location.hostname === "soyaaaa081305.github.io"
  );
}

export default function App() {
  return isGitHubPagesNotice() ? <PrankLanding /> : <StudyReviewerApp />;
}

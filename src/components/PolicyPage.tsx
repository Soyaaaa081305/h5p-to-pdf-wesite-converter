import { ArrowLeft, ExternalLink } from "lucide-react";

type Page = "terms" | "privacy";

const pageContent: Record<
  Page,
  {
    title: string;
    intro: string;
    sections: Array<{ title: string; body: string }>;
  }
> = {
  privacy: {
    title: "Privacy",
    intro:
      "Your course files are previewed in this browser. The app sends selected material to Google only when you choose to generate a reviewer.",
    sections: [
      {
        title: "Files and local data",
        body: "H5P archives, PDFs, HTML pages, transcripts, and text files are read in your browser. This app does not upload them to its own account, database, or storage. Imported source content remains in page memory until you remove it or close the page.",
      },
      {
        title: "Gemini API key",
        body: "The key you enter is saved in this browser's local storage, not on the app's server. Anyone who can use this browser profile may be able to access it. When you test the key or generate a reviewer, the key is sent directly to Google in an API request. Remove it from the reviewer panel or clear this browser's site data when you no longer want it saved. Google recommends keeping production API keys on a server; this browser-based app cannot protect your key from browser extensions or someone with access to your profile.",
      },
      {
        title: "AI reviewer and Google data use",
        body: "When you choose Generate reviewer, the selected study text, PDF, or public YouTube link is sent directly to Google Gemini using your key. If you choose to transcribe an audio or video file, that local file is uploaded to Google Gemini Files API and used to create its transcript. The app requests immediate deletion after the transcript is created; Google says Files API uploads are automatically deleted within 48 hours. On Google's unpaid services, Google may use submitted content and generated responses to improve products and machine-learning technologies, and human reviewers may process them. Different data terms apply when using paid services. Do not submit personal, confidential, or restricted content.",
      },
      {
        title: "YouTube and external services",
        body: "YouTube previews load from YouTube. Adding a public video URL may send that URL to Gemini when you generate a reviewer. The app does not download a YouTube video's audio for transcription; to request a transcript, choose a local video or audio copy you are allowed to share with Google. Google and YouTube process requests under their own policies.",
      },
      {
        title: "Accounts and retention",
        body: "The app does not create user accounts or keep a study history. Your saved API key stays in this browser until you remove it or clear the browser's site data. Google handles API keys, prompts, responses, and usage under the terms for the Google project associated with your key.",
      },
    ],
  },
  terms: {
    title: "Terms of use",
    intro:
      "Use the AI reviewer only if you are 18 or older, and only with course materials you are allowed to process with an external AI service.",
    sections: [
      {
        title: "Age requirement",
        body: "Google's Gemini API terms require users to be at least 18 and restrict API clients that are directed to or likely to be accessed by people under 18. Do not use the AI reviewer if you are under 18. This site is not intended for minors.",
      },
      {
        title: "Your materials and key",
        body: "You are responsible for the files and links you import, your permission to process and share them, and the Gemini API key you provide. The app sends selected study content only when you generate a reviewer or choose a media file to transcribe and accept the data-sharing notice. When media is uploaded for transcription, the app requests its deletion from Google after the transcript is created; Google Files API uploads are automatically deleted within 48 hours. Restrict your key to the Gemini API and remove it from shared devices.",
      },
      {
        title: "Usage and charges",
        body: "Gemini requests use the Google project associated with your API key. Quotas and free availability can change. If billing is enabled on that project, your requests may incur charges; this app cannot see or control your Google billing settings. For free-only use, do not attach billing to the project that owns your key, and monitor Google's current quotas and terms.",
      },
      {
        title: "AI-generated study aids",
        body: "Summaries, definitions, and practice questions are generated automatically and may be incomplete or incorrect. Check them against the original material. They are study aids, not official course answers, grades, or professional advice.",
      },
      {
        title: "Availability and external services",
        body: "The app depends on Google Gemini, Google AI Studio, YouTube, and Firebase Hosting. Their service limits and terms apply. The app does not guarantee that requests will always be available or that generated answers will be accurate or suitable for a particular purpose.",
      },
    ],
  },
};

export function PolicyPage({ page }: { page: Page }) {
  const content = pageContent[page];

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <article>
        <a
          href="/"
          onClick={handleHomeClick}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to study reviewer
        </a>

        <header className="mt-7 border-b border-zinc-200 pb-7 dark:border-zinc-800">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-950 dark:text-white sm:text-3xl">
            {content.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
            {content.intro}
          </p>
        </header>

        <div>
          {content.sections.map((section) => (
            <section
              key={section.title}
              className="border-b border-zinc-200 py-5 last:border-b-0 dark:border-zinc-800 sm:py-6"
            >
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-base">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:leading-7">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:pt-6">
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Google service details:{" "}
            <a
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-indigo-700 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-indigo-300"
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gemini API terms
            </a>
            ,{" "}
            <a
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-indigo-700 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-indigo-300"
              href="https://ai.google.dev/gemini-api/docs/api-key"
              target="_blank"
              rel="noopener noreferrer"
            >
              API key security guidance
            </a>
            , and{" "}
            <a
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-indigo-700 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-indigo-300"
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google privacy information
            </a>{" "}
            <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
          </p>
        </footer>
      </article>
    </main>
  );
}

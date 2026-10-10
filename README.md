# H5P Study Reviewer

A browser-based study workspace for H5P courses, PDFs, HTML pages, text files, captions, and YouTube videos. Preview course material locally, then ask Gemini to create a source-based summary, key terms, and practice questions.

**Live app:** [https://h5p-to-pdf-converter.web.app](https://h5p-to-pdf-converter.web.app)

## Use the app

1. Add one or more `.h5p`, `.zip`, `.pdf`, `.html`, `.txt`, `.md`, `.srt`, or `.vtt` files. The app finds YouTube videos embedded in H5P packages.
2. Switch between sources using the source tabs. H5P packages still support the existing answer inspection and PDF export features.
3. To transcribe an H5P course video, choose that video's **Choose file** action and select a local audio/video copy you are allowed to send to Google. Gemini transcribes one selected file at a time and adds its transcript as a separate source.
4. For an AI reviewer, choose a question count and difficulty, read and accept the data-sharing notice, then select **Generate reviewer**.
5. Review answers against the original source. Copy the reviewer or use the browser print dialog to save it as PDF.

PDF inputs are limited to 12 MB; other supported documents are limited to 2 MB. Audio/video transcription uploads are limited to 250 MB. Gemini reviewer text context is capped at 48,000 characters; full transcripts remain available in the source viewer, while reviewer requests use the first 48,000 characters. H5P archive validation continues to enforce limits of 256 MB per archive, 10,000 entries, 10 MB per JSON file, and 512 MB expanded content.

## Supported content

The viewer renders supported H5P content such as Course Presentation, Interactive Book, Column, Interactive Video, Question Set, Accordion, Image Slider, and common image, text, audio, and video items. Unsupported libraries are identified in the interface.

Answer extraction is limited to supported versions of these activity libraries: Fill in the Blanks, Drag the Words, Drag and Drop, Multiple Choice, True/False, Single Choice Set, Summary, and Mark the Words. The app reports when an answer is missing or unsupported; it does not infer answers. The AI reviewer excludes H5P answer-key fields from its extracted study text.

## Privacy and free-tier operation

Imported files are processed in the browser and are not uploaded to an app account, database, or storage bucket. They remain in page memory until removed or the page closes. Selecting **Generate reviewer** sends the selected study text, PDF, or public YouTube link directly to Google Gemini. Selecting an audio/video file to transcribe uploads that file to Google's Gemini Files API; the app requests immediate deletion after use, and Google automatically deletes Files API uploads within 48 hours. Read the in-app [privacy notice](/privacy) and [terms](/terms) before use.

Each person enters their own Gemini API key in the reviewer panel. The key is saved in that browser's local storage and sent directly to Google; it is not sent to this app's server. Never put a Gemini key in source code, a `VITE_` environment variable, or a shared repository. Anyone with access to the browser profile may be able to use a saved key. Google's security guidance recommends server-side key handling for production applications.

The Gemini API terms require adult access and forbid API clients directed to or likely to be accessed by minors. The app asks for adult confirmation and data-sharing consent before sending a request. With unpaid Gemini service, Google may use content and responses to improve products, and human reviewers may process them. Do not submit personal, confidential, or restricted material. Quotas and free-tier availability can change. If billing is enabled for the Google project behind a key, requests may incur charges; this app cannot see or control that account's billing settings. See the current [Gemini API terms](https://ai.google.dev/gemini-api/terms) and [API key guidance](https://ai.google.dev/gemini-api/docs/api-key).

The app does not include an account system or public admin console. Firebase Hosting serves the site; Gemini usage and limits belong to each user's Google project and key.

YouTube previews use YouTube's embedded player. This app does not download audio from YouTube; transcribe only a local audio/video file you own or are allowed to share with Google.

## Configure the app

1. Each user creates or retrieves their key in [Google AI Studio](https://aistudio.google.com/apikey). Restrict it to the Gemini API, and do not use a Google project with billing enabled if the intent is free-only usage.
2. In the app, paste the key into **Gemini API key**, choose **Test key**, then **Save key**. It remains in that browser until removed or the browser's site data is cleared.
3. Build and deploy:

```sh
npm ci
npm run build
npx firebase-tools deploy --only hosting:app --project h5p-study-reviewer
```

Firebase Hosting serves the production build from `dist`. The included configuration sets security response headers and routes clean URLs such as `/privacy` and `/terms` back to the app. The old `/soya` URL forwards to the GitHub repository.

## Local development

Requirements: Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

The development server prints its local URL when it starts. File viewing works without cloud credentials. The AI reviewer uses the key saved in the current browser; a key restricted to a specific website may need localhost added while developing.

## Verification

```sh
npm run check
npm audit --omit=dev --audit-level=moderate
npx playwright install chromium
npm run test:e2e
```

`npm run check` verifies formatting, runs the unit tests, type-checks the project, and creates a production build. The two-original-books acceptance test is skipped unless `H5P_SAMPLE_FILES` points to two local `.h5p` files separated by `|`; sample course files are not stored in the repository.

## Technology

| Area                 | Technology                             |
| -------------------- | -------------------------------------- |
| UI                   | React 18, TypeScript                   |
| Build and styling    | Vite 8, Tailwind CSS 3                 |
| Archive processing   | JSZip, Web Worker                      |
| HTML sanitization    | DOMPurify                              |
| PDF and image export | jsPDF and the Canvas API               |
| AI reviewer          | Gemini API REST endpoint, per-user key |
| Hosting              | Firebase Hosting (Spark plan)          |
| Verification         | Prettier, Vitest, Playwright           |

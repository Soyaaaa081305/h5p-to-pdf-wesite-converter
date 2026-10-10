# H5P Study Reviewer domain notice

This GitHub Pages address shows a playful handoff notice. The current app is hosted at [h5p-to-pdf-converter.web.app](https://h5p-to-pdf-converter.web.app).

The page is a static joke notice: it has no login, upload form, or API-key field. It displays the supplied Nick Wilde GIF and links directly to the Firebase app.

## Local preview

Requirements: Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

## Build and deployment

`npm run check` runs formatting, unit checks, and a production build. The GitHub Actions workflow also runs the browser check and publishes successful builds to GitHub Pages when changes reach `main`.

The original converter implementation remains in this repository's history and source modules; the published root now serves the migration notice.

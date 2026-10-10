import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const isGitHubPagesNotice =
  import.meta.env.VITE_DEPLOY_TARGET === "github-pages" ||
  window.location.hostname === "soyaaaa081305.github.io";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    if (isGitHubPagesNotice) {
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          const pageScope = new URL("./", window.location.href).href;
          await Promise.all(
            registrations
              .filter((registration) => registration.scope === pageScope)
              .map((registration) => registration.unregister()),
          );
          if ("caches" in window) {
            await caches.delete("h5p-pdf-shell-v3");
          }
        })
        .catch((err) => {
          console.warn("Could not clear the previous offline app shell:", err);
        });
      return;
    }

    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        registration.update();
        console.log(
          "H5P Study Reviewer service worker registered:",
          registration.scope,
        );
      })
      .catch((err) => {
        console.warn(
          "H5P Study Reviewer service worker registration failed:",
          err,
        );
      });
  });
}

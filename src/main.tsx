import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Remove the offline app shell left by the previous version of this page.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
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
  });
}

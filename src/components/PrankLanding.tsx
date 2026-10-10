import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

const appUrl = "https://h5p-to-pdf-converter.web.app";

export function PrankLanding() {
  useEffect(() => {
    document.title = "Halaa, nascam ka! — H5P domain update";
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute(
        "content",
        "A playful domain update for the H5P study reviewer. Find the app at its new Firebase address.",
      );
  }, []);

  return (
    <div className="prank-page">
      <div className="notice-ticker" aria-label="Domain update notice">
        <div className="notice-ticker__track" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>
              ⚠ DOMAIN UPDATE ⚠&nbsp; H5P TO PDF&nbsp; • &nbsp;DOMAIN UPDATE
              &nbsp; ⚠&nbsp;
            </span>
          ))}
        </div>
      </div>

      <main className="prank-main">
        <article className="notice-card" aria-labelledby="prank-title">
          <div className="notice-card__topline">
            <span className="notice-brand">
              <span className="notice-brand__dot" aria-hidden="true" />
              H5P TO PDF
            </span>
            <span className="notice-stamp">VERY IMPORTANT UPDATE</span>
          </div>

          <div className="notice-alert">
            <span aria-hidden="true">⚠</span> THE DOMAIN HAS MOVED{" "}
            <span aria-hidden="true">⚠</span>
          </div>

          <div className="notice-card__body">
            <figure className="meme-frame">
              <img
                className="meme-frame__image"
                src={`${import.meta.env.BASE_URL}nick-wilde-zootopia-2.gif`}
                alt="Nick Wilde gives a knowing look"
                width="220"
                height="220"
                fetchPriority="high"
                decoding="async"
              />
              <figcaption>your new domain guide</figcaption>
            </figure>

            <div className="notice-copy">
              <p className="notice-copy__eyebrow">a quick announcement</p>
              <h1 id="prank-title">HALAA, NASCAM KA!</h1>
              <p className="notice-copy__message">
                halaa nascam ka, de joke lang.. updated the domain, ito na
                gamitin niyo -&gt;
              </p>
              <a className="new-home-link" href={appUrl}>
                <span>Open the updated app</span>
                <ArrowRight aria-hidden="true" size={19} strokeWidth={2.5} />
              </a>
              <p className="new-home-address">h5p-to-pdf-converter.web.app</p>
            </div>
          </div>

          <div className="notice-card__footer">
            <span>de joke lang · page updated</span>
            <span>see you on the new site&nbsp; ↗</span>
          </div>
        </article>

        <p className="prank-footnote">
          Walang forms, log in, o uploads dito. Prank notice lang ito.
        </p>
      </main>
    </div>
  );
}

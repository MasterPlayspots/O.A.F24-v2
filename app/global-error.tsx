"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "global" } });
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#737688", color: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.4, margin: 0 }}>fund24</p>
          <h1 style={{ fontSize: "3rem", fontWeight: 700, margin: "20px 0 16px", letterSpacing: "-0.02em" }}>
            Ein unerwarteter Fehler
          </h1>
          <p style={{ maxWidth: "440px", opacity: 0.7, lineHeight: 1.6 }}>
            Die Anwendung konnte nicht geladen werden. Versuchen Sie es erneut oder laden Sie die Seite neu.
          </p>
          <p style={{ marginTop: "12px", fontSize: "12px", opacity: 0.4, fontFamily: "monospace" }}>
            Fehler-ID: {error.digest || "unbekannt"}
          </p>
          <div style={{ marginTop: "32px", display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{ padding: "12px 24px", background: "#6575ad", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
            >
              Erneut versuchen
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{ padding: "12px 24px", background: "transparent", color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", fontWeight: 600 }}
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
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
            Die Anwendung konnte nicht geladen werden. Bitte lade die Seite neu.
          </p>
          {error.digest && (
            <p style={{ marginTop: "12px", fontSize: "12px", opacity: 0.4, fontFamily: "monospace" }}>
              Fehler-ID: {error.digest}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{ marginTop: "32px", padding: "12px 24px", background: "#6575ad", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: 600 }}
          >
            Neu laden
          </a>
        </div>
      </body>
    </html>
  );
}

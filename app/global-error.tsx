"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "3rem", margin: 0 }}>⚠</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111", marginTop: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginTop: "0.75rem", maxWidth: "28rem" }}>
            A critical error occurred. Please reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              background: "#111",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: "3rem", margin: 0 }}>⚠</p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111", marginTop: "0.75rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#6b7280", marginTop: "0.75rem", maxWidth: "28rem" }}>
        An unexpected error occurred. Please try again.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
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
        <Link
          href="/"
          style={{
            padding: "0.625rem 1.5rem",
            borderRadius: "9999px",
            background: "transparent",
            color: "#111",
            border: "1px solid #d1d5db",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

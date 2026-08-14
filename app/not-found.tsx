import Link from "next/link";

export default function RootNotFound() {
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
      <p style={{ fontSize: "4rem", fontWeight: 700, color: "#e5e7eb", margin: 0 }}>404</p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111", marginTop: "0.5rem" }}>
        Page not found
      </h1>
      <p style={{ color: "#6b7280", marginTop: "0.75rem", maxWidth: "28rem" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "1.5rem",
          display: "inline-block",
          padding: "0.625rem 1.5rem",
          borderRadius: "9999px",
          background: "#111",
          color: "#fff",
          textDecoration: "none",
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </div>
  );
}

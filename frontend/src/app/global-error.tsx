"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ background: "#0a0b14", color: "#f0f0f5", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h2>
          <button onClick={() => reset()} style={{ padding: "8px 16px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

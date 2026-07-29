"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
          }}
        >
          <div
            role="alert"
            style={{
              maxWidth: "36rem",
              textAlign: "center",
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "1.5rem",
              padding: "2rem",
            }}
          >
            <p style={{ color: "#1d4ed8", fontWeight: 800 }}>HEDEF KAPISI</p>
            <h1 style={{ fontSize: "2rem", margin: "1rem 0 0.75rem" }}>
              Platform şu anda yüklenemiyor
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              Geçici bir sorun oluştu. Teknik ayrıntılar güvenliğiniz için
              gösterilmiyor.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                minHeight: "2.75rem",
                border: 0,
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                background: "#1d4ed8",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Yeniden dene
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

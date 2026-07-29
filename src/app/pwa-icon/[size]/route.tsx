import { ImageResponse } from "next/og";

const SUPPORTED_SIZES = new Set([192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: rawSize } = await params;
  const parsedSize = Number(rawSize);
  if (!SUPPORTED_SIZES.has(parsedSize)) {
    return new Response("İkon boyutu bulunamadı.", { status: 404 });
  }

  const outerPadding = Math.round(parsedSize * 0.1);
  const targetSize = Math.round(parsedSize * 0.52);
  const lineWidth = Math.max(8, Math.round(parsedSize * 0.055));
  const centerSize = Math.round(parsedSize * 0.14);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#2563eb",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: outerPadding,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "white",
            borderRadius: Math.round(parsedSize * 0.2),
            display: "flex",
            height: "100%",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              border: `${lineWidth}px solid #2563eb`,
              borderRadius: "50%",
              display: "flex",
              height: targetSize,
              justifyContent: "center",
              position: "relative",
              width: targetSize,
            }}
          >
            <div
              style={{
                border: `${Math.max(5, Math.round(lineWidth * 0.65))}px solid #60a5fa`,
                borderRadius: "50%",
                height: Math.round(targetSize * 0.57),
                width: Math.round(targetSize * 0.57),
              }}
            />
            <div
              style={{
                background: "#2563eb",
                borderRadius: "50%",
                height: centerSize,
                position: "absolute",
                width: centerSize,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: parsedSize, height: parsedSize },
  );
}

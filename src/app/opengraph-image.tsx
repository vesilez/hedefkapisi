import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.name;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #1d4ed8, #0f172a)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: 80,
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 84, fontWeight: 800 }}>{siteConfig.name}</div>
      <div style={{ fontSize: 36, marginTop: 28 }}>
        Hayal et. Paylaş. Birlikte gerçekleştir.
      </div>
    </div>,
    size,
  );
}

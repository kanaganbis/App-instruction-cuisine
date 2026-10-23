import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for phones (iOS does not use SVG icons). */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e6b47",
      }}
    >
      <svg width="120" height="120" viewBox="0 0 64 64">
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 31h38a19 19 0 0 1-38 0z" />
          <path d="M24 22c0-3 2.5-4 2.5-7M32 22c0-3 2.5-4 2.5-7M40 22c0-3 2.5-4 2.5-7" />
        </g>
      </svg>
    </div>,
    size,
  );
}

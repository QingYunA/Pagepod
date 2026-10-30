import { ImageResponse } from "next/og";

export const alt = "Pagepod - Free HTML hosting";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "1080px",
            height: "510px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            border: "1px solid #27272a",
            background: "#09090b",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#a1a1aa",
              fontSize: "22px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                display: "flex",
                border: "1px solid #52525b",
              }}
            />
            HTML hosting, without the setup
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "104px", fontWeight: 700, letterSpacing: "-5px" }}>
              Pagepod
            </div>
            <div style={{ display: "flex", marginTop: "24px", color: "#d4d4d8", fontSize: "34px" }}>
              Free HTML hosting: save, run, and share
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "24px",
              borderTop: "1px solid #27272a",
              color: "#a1a1aa",
              fontSize: "22px",
            }}
          >
            <span>No registration required</span>
            <span>pagepod.dev</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "uymai.net — links, projects, and finaglings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#0b0f19";
const ACCENT = "#6d4aff";
const LOGO_SIZE = 280;
// The icon PNG has an opaque black margin around its rounded tile; scale up and
// clip so only the tile shows.
const ICON_SOURCE_PX = 512;
const ICON_TILE_INSET_PX = 30;
const LOGO_SCALE = ICON_SOURCE_PX / (ICON_SOURCE_PX - 2 * ICON_TILE_INSET_PX);
const LOGO_RENDER_SIZE = Math.round(LOGO_SIZE * LOGO_SCALE);
const LOGO_OFFSET = (LOGO_SIZE - LOGO_RENDER_SIZE) / 2;

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/icons/icon-512x512.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: BACKGROUND,
          color: "#f5f5f5",
        }}
      >
        <div
          style={{
            display: "flex",
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: LOGO_SIZE * 0.22,
            overflow: "hidden",
          }}
        >
          <img
            src={logoSrc}
            width={LOGO_RENDER_SIZE}
            height={LOGO_RENDER_SIZE}
            alt=""
            style={{ marginLeft: LOGO_OFFSET, marginTop: LOGO_OFFSET }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>uymai.net</div>
          <div style={{ fontSize: 36, color: "#a3a3a3", marginTop: 12 }}>
            Links, projects, and finaglings
          </div>
          <div style={{ width: 120, height: 8, background: ACCENT, marginTop: 32 }} />
        </div>
      </div>
    ),
    size
  );
}

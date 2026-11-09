"use client";

import { preconnect, preload } from "react-dom";

const FONT_ORIGIN = "https://cdn.jsdelivr.net";
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn[wght].woff2";

export default function FontResourceHints() {
  preconnect(FONT_ORIGIN, { crossOrigin: "anonymous" });
  preload(FONT_URL, {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  return null;
}

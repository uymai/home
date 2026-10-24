import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

// Public, linked pages only. /contact and /wishlist are intentionally unlisted.
const PATHS = [
  "/",
  "/discord",
  "/steam",
  "/finaglings",
  "/finaglings/nightlight",
  "/finaglings/guitar-lizard",
  "/finaglings/toilet-paper-math",
  "/finaglings/binary",
  "/finaglings/big-o",
  "/finaglings/np-complete",
  "/finaglings/sorting-algorithms",
  "/finaglings/bobs-27",
  "/finaglings/dart-game",
  "/finaglings/dart-checkout",
  "/finaglings/hawkins-legion-darts",
  "/finaglings/workout-tracker",
  "/steves-game",
  "/number-grid",
  "/magic-square",
  "/warp-protocol",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
}

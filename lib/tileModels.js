/**
 * Shared pedestal mesh — one GLB, many tile types via runtime vertex-color repaint.
 * Footprint: 2.082 × 2.082 m (slight bleed over logical TILE_SIZE = 2 for seamless joints).
 */
export const PEDESTAL_TILE_URL =
  "/images/tiles/kenney_platformer-kit/block-grass-large.glb";

/** Optional Kenney wedge/stair GLB — procedural mesh used until this file exists. */
export const STAIR_TILE_URL = "/images/tiles/stair.glb";

/** Mesh Y is normalized 0..1; vertices at/above this ratio get the `top` palette color. */
export const TILE_TOP_Y_RATIO = 0.8;

/**
 * Palette per tile key (top = walking surface, side = dirt/bank).
 * ACNH-style: bright saturated tops that survive sunset light, warm tan "cliff"
 * sides unify grass/path/sand into one continuous bank silhouette.
 */
const SIDE_TAN = "#d4a96e";

export const TILE_PALETTES = {
  grass: { top: "#9ec84b", side: SIDE_TAN },
  path: { top: "#d4b98a", side: SIDE_TAN },
  sand: { top: "#f3dc92", side: "#e6c47a" },
  dirt: { top: "#b78550", side: "#8c5a36" },
  asphalt: { top: "#7d766d", side: "#8a8175" }, // #6f6a63 (darker)
  stair: { top: "#c4a882", side: SIDE_TAN },
  brick: { top: "#d9a98a", side: "#b07a5a" },
};

/** Per-tile metadata (gameplay flags live here later). */
export const TILE_INFO = {
  grass: { walkable: true },
  path: { walkable: true },
  sand: { walkable: true },
  dirt: { walkable: true },
  asphalt: { walkable: true },
  stair: { walkable: true },
  brick: { walkable: true },
};

export const DEFAULT_TILE_KEY = "grass";

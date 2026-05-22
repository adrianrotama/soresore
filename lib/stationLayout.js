/**
 * Shared depot layout — rails, spawn, and hut placement (StationRailProps + StationHut).
 *
 * World axes (check STATION_HUT_ROTATION before assuming Blender defaults):
 *   +X  — rail segments and train consist extend from STATION_START
 *   +Z  — “south” in the play space; visitor spawn is on this side of the hut
 *   Y   — up; STATION_START.y = TILE_LEVEL_HEIGHT so rails/train/hut sit on the
 *         tile pedestal surface (level 0). Helpers respect start[1].
 *
 * Hut GLB (`station-hut.glb`) at STATION_HUT_ROTATION [0,0,0]: local −Z ≈ hut front (door),
 * local +Z ≈ platform / track side. Tune hut position/scale here — not in GAME.md.
 */

import { TILE_LEVEL_HEIGHT } from "./world";

export const STATION_START = [-40, TILE_LEVEL_HEIGHT, -7];

export const RAIL_COUNT = 12;
export const RAIL_SCALE = 1.8;
export const TRAIN_SCALE = 1.8;
export const CROSSING_SCALE = 0.02;

export const SEGMENT_LENGTH = RAIL_SCALE * 2;
export const TRAIN_OFFSET = 14;
export const TRAIN_CAR_SPACING = TRAIN_SCALE * 2.45;

export const PLAYER_SPAWN_Y = 0.5;

/** Applied to station-hut.glb (export aligned to world). Change only if the GLB is re-exported rotated. */
export const STATION_HUT_ROTATION = [0, 0, 0];
/** Visual scale of station-hut.glb vs Kenney rails/train. */
export const STATION_HUT_SCALE = 1.7;

/** Locomotive origin along +X from STATION_START (matches StationRailProps head, carIndex 0). */
export function trainHeadPosition(start = STATION_START) {
  return [start[0] + TRAIN_OFFSET, start[1], start[2]];
}

/**
 * World position [x, y, z] of the station-hut.glb root.
 * Offsets from STATION_START are hand-tuned so the built-in platform meets the rail line.
 */
export function stationHutWorldPosition(start = STATION_START) {
  return [start[0] + 7, start[1], start[2] + 9];
}

/**
 * Player spawn in front of the hut (visitor side).
 * Offsets from stationHutWorldPosition() — tuned so the cube faces the platform / +X rails.
 */
export function getPlayerSpawn(start = STATION_START) {
  const [hx, , hz] = stationHutWorldPosition(start);
  return { x: hx + 6, y: start[1] + PLAYER_SPAWN_Y, z: hz + 8 };
}

/** Legacy flat platform helper (mesh removed; station-hut.glb includes planks). Kept for future footstep zones. */
export function platformLayout(start = STATION_START) {
  const trackSpan = (RAIL_COUNT - 1) * SEGMENT_LENGTH;
  return {
    position: [start[0] + trackSpan / 2, start[1] + 0.02, start[2] + 1.5],
    size: [trackSpan + SEGMENT_LENGTH * 1.4, 6],
  };
}

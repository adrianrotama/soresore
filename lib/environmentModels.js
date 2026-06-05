/**
 * Environment asset registry: URL + optional static grid collision per kind.
 * React prop wrappers stay in `component/Decoration.js`.
 *
 * Collision (see `lib/decorationCollision.js`):
 * - `cells` or `cellsX` / `cellsZ` — size in tile units (1 = one 2 m cell).
 * - `anchor` — `"center"` (default, matches mesh at gx/gz) or `"corner"`.
 * - `offset` — `[x, y, z]` meters in local space before rotation; use to
 *   shift without resizing (e.g. railing: `offset: [-0.4, 0, 0]` nudges left).
 */

/**
 * @typedef {{
 *   blocks: true,
 *   cells?: number,
 *   cellsX?: number,
 *   cellsZ?: number,
 *   anchor?: "center" | "corner",
 *   offset?: [number, number, number],
 * }} GridCollision
 */

/** @type {Record<string, { url: string, collision?: GridCollision }>} */
export const ENV_REGISTRY = {
  trainHead: { url: "/images/environments/train-electric-square-a.glb" },
  trainCar: { url: "/images/environments/train-electric-square-b.glb" },
  trainTail: { url: "/images/environments/train-electric-square-c.glb" },
  railStraight: { url: "/images/environments/railroad-straight.glb" },
  railCrossing: { url: "/images/environments/railroad-crossing.glb" },
  railCrossingLong: { url: "/images/environments/railroad-crossing-long.glb" },
  bench: {
    url: "/images/environments/bench.gltf",
    collision: { blocks: true, cellsX: 0.1, cellsZ: 0.1, offset: [0.1, 0, 0] },
  },
  trashcan: {
    url: "/images/environments/trashcan.gltf",
    collision: { blocks: true, cells: 1 },
  },
  tree: {
    url: "/images/environments/tree.gltf",
    collision: { blocks: true, cells: 1 },
  },
  treeLarge: {
    url: "/images/environments/tree_large.gltf",
    collision: { blocks: true, cells: 1 },
  },
  streetLantern: {
    url: "/images/environments/street_lantern.gltf",
    collision: { blocks: true, cells: 1 },
  },
  railroadStraight: { url: "/images/environments/railroad-straight.glb" },
  bushLarge: {
    url: "/images/environments/bush_large.gltf",
  },
  bush: {
    url: "/images/environments/bush.gltf",
  },
  cobbleStone: { url: "/images/environments/cobble_stones.gltf" },
  cobbleStoneLarge: { url: "/images/environments/cobble_stones_large.gltf" },
  flowerA: { url: "/images/environments/flower_a.gltf" },
  flowerB: { url: "/images/environments/flower_b.gltf" },
  grassA: { url: "/images/environments/grass_a.gltf" },
  grassB: { url: "/images/environments/grass_b.gltf" },
  hedgeStraight: {
    url: "/images/environments/hedge_straight.gltf",
  },
  hedgeStraightLong: {
    url: "/images/environments/hedge_straight_long.gltf",
  },
  hedgeCorner: {
    url: "/images/environments/hedge_corner.gltf",
  },
  vendingMachine: {
    url: "/images/environments/vending_machine.glb",
    collision: { blocks: true, cells: 1 },
  },
  railing: {
    url: "/images/environments/railing2.glb",
    collision: {
      blocks: true,
      cellsX: 2,
      cellsZ: 0.15,
      offset: [-0.55, 0, 0.2],
    },
  },
};

/** @type {Record<string, string>} */
export const ENV_MODELS = Object.fromEntries(
  Object.entries(ENV_REGISTRY).map(([key, entry]) => [key, entry.url])
);

export const ENV_MODEL_URLS = [...new Set(Object.values(ENV_MODELS))];

/** Static decoration collision from registry (undefined = walk-through). */
export function collisionForKind(kind) {
  return ENV_REGISTRY[kind]?.collision;
}

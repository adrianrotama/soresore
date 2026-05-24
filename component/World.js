"use client";

import TileMap from "@/component/TileMap";
import Decoration from "@/component/Decoration";
import Landmark from "@/component/Landmark";

/**
 * Renders a world: terrain grid + decorations + landmarks. Single mount in scene.
 *
 * positionRef flows to landmarks when a kind needs player proximity.
 *
 * Later phases extend this with:
 *   - elevation (per-cell level)
 *   - slopes
 *   - player ground-snap via surfaceYAt
 *   - walkability rules
 */
export default function World({ data, positionRef }) {
  return (
    <group name="world">
      <TileMap map={data.map} origin={data.origin} />

      <group name="world-decorations">
        {data.decorations?.map((deco, i) => (
          <Decoration key={`deco-${i}`} world={data} deco={deco} />
        ))}
      </group>

      <group name="world-landmarks">
        {data.landmarks?.map((landmark, i) => (
          <Landmark
            key={`landmark-${i}`}
            landmark={landmark}
            positionRef={positionRef}
          />
        ))}
      </group>
    </group>
  );
}

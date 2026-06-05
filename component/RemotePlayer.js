"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { lerpPosition } from "@/lib/interpolation";
import PlayerAvatar from "@/component/PlayerAvatar";
import { DEFAULT_PLAYER_CAT } from "@/lib/playerModels";
import { paletteFromSeed } from "@/lib/guestCatPalette";

/**
 * Remote avatar: network position (props) vs visual position (refs + useFrame).
 * Supabase updates only touch networkTarget; the mesh follows via lerp.
 */
export default function RemotePlayer({
  playerId,
  networkPosition,
  catModel = DEFAULT_PLAYER_CAT,
}) {
  const guestPalette =
    catModel === "quaternius" && playerId ? paletteFromSeed(playerId) : null;
  const meshRef = useRef();
  const networkTarget = useRef({ ...networkPosition });
  const visualPosition = useRef({ ...networkPosition });

  // Network snapshot changed — update target only, not the mesh.
  useEffect(() => {
    networkTarget.current.x = networkPosition.x;
    networkTarget.current.y = networkPosition.y;
    networkTarget.current.z = networkPosition.z;
  }, [networkPosition.x, networkPosition.y, networkPosition.z]);

  useFrame((_, delta) => {
    lerpPosition(visualPosition.current, networkTarget.current, delta);

    if (meshRef.current) {
      const { x, y, z } = visualPosition.current;
      meshRef.current.position.set(x, y, z);
    }
  });

  const { x, y, z } = visualPosition.current;

  return (
    <group ref={meshRef} position={[x, y, z]}>
      <PlayerAvatar
        modelKey={catModel}
        guestPalette={guestPalette}
      />
    </group>
  );
}

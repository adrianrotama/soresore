"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { lerpPosition } from "@/lib/interpolation";
import PlayerAvatar from "@/component/PlayerAvatar";
import ChibiAvatar from "@/component/ChibiAvatar";
import ChatBubble from "@/component/ChatBubble";
import NameTag from "@/component/NameTag";
import { DEFAULT_APPEARANCE } from "@/lib/avatarParts";
import { DEFAULT_PLAYER_CAT } from "@/lib/playerModels";
import { paletteFromSeed } from "@/lib/guestCatPalette";

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Remote avatar: network position (props) vs visual position (refs + useFrame).
 * Supabase updates only touch networkTarget; the mesh follows via lerp.
 */
export default function RemotePlayer({
  playerId,
  networkPosition,
  avatarKind = "cat",
  appearance = DEFAULT_APPEARANCE,
  catModel = DEFAULT_PLAYER_CAT,
  chatBubbleText = null,
  nameTagText = null,
}) {
  const moving01Ref = useRef(0);
  const guestPalette =
    catModel === "quaternius" && playerId ? paletteFromSeed(playerId) : null;
  const meshRef = useRef();
  const networkTarget = useRef({ ...networkPosition });
  const visualPosition = useRef({ ...networkPosition });
  const prevXz = useRef({ x: networkPosition.x, z: networkPosition.z });
  const visualYaw = useRef(networkPosition.ry ?? 0);
  const targetYaw = useRef(networkPosition.ry ?? 0);

  // Network snapshot changed — update target only, not the mesh.
  useEffect(() => {
    networkTarget.current.x = networkPosition.x;
    networkTarget.current.y = networkPosition.y;
    networkTarget.current.z = networkPosition.z;
  }, [networkPosition.x, networkPosition.y, networkPosition.z]);

  useEffect(() => {
    targetYaw.current = Number.isFinite(networkPosition.ry) ? networkPosition.ry : 0;
  }, [networkPosition.ry]);

  useFrame((_, delta) => {
    lerpPosition(visualPosition.current, networkTarget.current, delta);

    if (delta > 0) {
      const dx = visualPosition.current.x - prevXz.current.x;
      const dz = visualPosition.current.z - prevXz.current.z;
      const speed = Math.hypot(dx, dz) / delta;
      const targetIntensity = Math.min(1, speed / 10);
      moving01Ref.current += (targetIntensity - moving01Ref.current) * Math.min(1, 12 * delta);
      prevXz.current.x = visualPosition.current.x;
      prevXz.current.z = visualPosition.current.z;
    }

    if (meshRef.current) {
      const { x, y, z } = visualPosition.current;
      meshRef.current.position.set(x, y, z);

      const dy = wrapAngle(targetYaw.current - visualYaw.current);
      visualYaw.current += dy * Math.min(1, 12 * delta);
      meshRef.current.rotation.y = visualYaw.current;
    }
  });

  const { x, y, z } = visualPosition.current;

  return (
    <group ref={meshRef} position={[x, y, z]}>
      {avatarKind === "chibi" ? (
        <ChibiAvatar moving01Ref={moving01Ref} appearance={appearance} />
      ) : (
        <PlayerAvatar
          modelKey={catModel}
          moving01Ref={moving01Ref}
          guestPalette={guestPalette}
        />
      )}
      <NameTag name={nameTagText} />
      <ChatBubble text={chatBubbleText} />
    </group>
  );
}

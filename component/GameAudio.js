"use client";

import { useEffect } from "react";
import { unlockGameAudio, setAudioMuted } from "@/lib/gameAudio";

/**
 * Unlocks Web Audio on first user gesture; starts ambience loop.
 * Browsers block autoplay until then.
 */
export default function GameAudio() {
  useEffect(() => {
    let unlocked = false;

    const tryUnlock = () => {
      if (unlocked) return;
      unlocked = true;
      unlockGameAudio().catch(() => {
        unlocked = false;
      });
    };

    const onVisibilityChange = () => {
      setAudioMuted(document.hidden);
    };

    window.addEventListener("keydown", tryUnlock, { once: false });
    window.addEventListener("pointerdown", tryUnlock, { once: false });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", tryUnlock);
      window.removeEventListener("pointerdown", tryUnlock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      setAudioMuted(true);
    };
  }, []);

  return null;
}

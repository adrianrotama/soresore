"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import ChibiAvatar from "@/component/ChibiAvatar";
import {
  DEFAULT_APPEARANCE,
  FACE_KEYS,
  FACE_PARTS,
  HAIR_COLOR_KEYS,
  HAIR_COLORS,
  HAIR_KEYS,
  HAIR_PARTS,
  OUTFIT_COLOR_KEYS,
  OUTFIT_COLORS,
  OUTFIT_KEYS,
  OUTFIT_PARTS,
  SKIN_COLOR_KEYS,
  SKIN_COLORS,
} from "@/lib/avatarParts";
import styles from "./CharacterCreator.module.scss";

const TABS = [
  { id: "hair", label: "Hair" },
  { id: "face", label: "Face" },
  { id: "outfit", label: "Outfit" },
];

const CAMERA_FOCUS = {
  body: { position: [0, 1.25, 4.5], target: [0, 0.3, 0], fov: 38 },
  head: { position: [1, 0.8, 2.6], target: [0, 0.3, 0], fov: 32 },
};

const _camPos = new Vector3();
const _lookAt = new Vector3();

// ChibiAvatar uses CHIBI_BASE_MODEL.rotation.y = π for in-game forward;
// add π so the preview faces the camera at +Z on load.
const PREVIEW_FACING_YAW = Math.PI / 1.5;

function randomKey(keys) {
  return keys[Math.floor(Math.random() * keys.length)];
}

/** Smooth camera zoom — head for hair/face, full body for outfit. */
function PreviewCamera({ focus }) {
  const { camera } = useThree();
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useFrame((_, delta) => {
    const preset =
      focusRef.current === "head" ? CAMERA_FOCUS.head : CAMERA_FOCUS.body;
    const t = 1 - Math.exp(-8 * delta);
    _camPos.set(...preset.position);
    camera.position.lerp(_camPos, t);
    if (camera.fov !== undefined) {
      camera.fov += (preset.fov - camera.fov) * t;
      camera.updateProjectionMatrix();
    }
    _lookAt.set(...preset.target);
    camera.lookAt(_lookAt);
  });

  return null;
}

/** Turntable + manual drag rotation (AGENTS cozy rule: gentle, no oscillation). */
function PreviewRig({ appearance, autoSpin, rotationRef }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (autoSpin) rotationRef.current += delta * 0.5;
    if (ref.current) {
      ref.current.rotation.y = PREVIEW_FACING_YAW + rotationRef.current;
    }
  });
  return (
    <group ref={ref}>
      <ChibiAvatar appearance={appearance} />
    </group>
  );
}

function ChipRow({ options, value, onSelect }) {
  return (
    <div className={styles.chips}>
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`${styles.chip} ${key === value ? styles.chipActive : ""}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SwatchRow({ options, value, onSelect }) {
  return (
    <div className={styles.swatches}>
      {options.map(({ key, label, color }) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={label}
          className={`${styles.swatch} ${
            key === value ? styles.swatchActive : ""
          }`}
          style={{ background: color }}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  );
}

export default function CharacterCreator({
  open,
  appearance,
  onConfirm,
  onClose,
  canClose = false,
}) {
  const [tab, setTab] = useState("hair");
  const [draft, setDraft] = useState(appearance ?? DEFAULT_APPEARANCE);
  const [autoSpin, setAutoSpin] = useState(true);
  const rotationRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);

  const cameraFocus = tab === "outfit" ? "body" : "head";

  // Reseed the draft each time the creator opens.
  useEffect(() => {
    if (open) {
      setDraft(appearance ?? DEFAULT_APPEARANCE);
      setTab("hair");
      setAutoSpin(true);
      rotationRef.current = 0;
    }
  }, [open, appearance]);

  function onStagePointerDown(e) {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastPointerXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onStagePointerMove(e) {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;
    rotationRef.current += dx * 0.012;
  }

  function onStagePointerUp(e) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const hairStyles = useMemo(
    () => HAIR_KEYS.map((key) => ({ key, label: HAIR_PARTS[key].label })),
    []
  );
  const faceStyles = useMemo(
    () => FACE_KEYS.map((key) => ({ key, label: FACE_PARTS[key].label })),
    []
  );
  const outfitStyles = useMemo(
    () => OUTFIT_KEYS.map((key) => ({ key, label: OUTFIT_PARTS[key].label })),
    []
  );
  const hairColors = useMemo(
    () =>
      HAIR_COLOR_KEYS.map((key) => ({
        key,
        label: HAIR_COLORS[key].label,
        color: HAIR_COLORS[key].color,
      })),
    []
  );
  const outfitColors = useMemo(
    () =>
      OUTFIT_COLOR_KEYS.map((key) => ({
        key,
        label: OUTFIT_COLORS[key].label,
        color: OUTFIT_COLORS[key].color,
      })),
    []
  );
  const skinColors = useMemo(
    () =>
      SKIN_COLOR_KEYS.map((key) => ({
        key,
        label: SKIN_COLORS[key].label,
        color: SKIN_COLORS[key].color,
      })),
    []
  );

  if (!open) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const shuffle = () =>
    setDraft({
      hair: randomKey(HAIR_KEYS),
      hairColor: randomKey(HAIR_COLOR_KEYS),
      face: randomKey(FACE_KEYS),
      skinColor: randomKey(SKIN_COLOR_KEYS),
      outfit: randomKey(OUTFIT_KEYS),
      outfitColor: randomKey(OUTFIT_COLOR_KEYS),
    });

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div
          className={styles.stage}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerUp}
        >
          <Canvas
            className={styles.stageCanvas}
            shadows
            camera={{ position: CAMERA_FOCUS.body.position, fov: CAMERA_FOCUS.body.fov }}
          >
            <PreviewCamera focus={cameraFocus} />
            <ambientLight intensity={0.85} color="#ffd4a0" />
            <directionalLight
              position={[2.5, 4, 2.5]}
              intensity={1.1}
              color="#fcb57f"
            />
            <directionalLight
              position={[-3, 2, -2]}
              intensity={0.35}
              color="#a8c4e0"
            />
            <group position={[0, -0.75, 0]}>
              <Suspense fallback={null}>
                <PreviewRig
                  appearance={draft}
                  autoSpin={autoSpin}
                  rotationRef={rotationRef}
                />
              </Suspense>
            </group>
          </Canvas>
          <div className={styles.stageGlow} />
          <div className={styles.stageToolbar}>
            <span className={styles.stageHint}>Drag to rotate</span>
            <button
              type="button"
              className={styles.spinToggle}
              aria-pressed={autoSpin}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setAutoSpin((on) => !on)}
            >
              {autoSpin ? "Pause spin" : "Resume spin"}
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <h2 className={styles.title}>Create your character</h2>
          <p className={styles.subtitle}>Pick a cozy look for your villager.</p>

          <div className={styles.tabs}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`${styles.tab} ${
                  tab === id ? styles.tabActive : ""
                }`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.section}>
            {tab === "hair" && (
              <>
                <div className={styles.sectionLabel}>Style</div>
                <ChipRow
                  options={hairStyles}
                  value={draft.hair}
                  onSelect={(key) => set({ hair: key })}
                />
                <div className={styles.sectionLabel}>Color</div>
                <SwatchRow
                  options={hairColors}
                  value={draft.hairColor}
                  onSelect={(key) => set({ hairColor: key })}
                />
              </>
            )}

            {tab === "face" && (
              <>
                <div className={styles.sectionLabel}>Expression</div>
                <ChipRow
                  options={faceStyles}
                  value={draft.face}
                  onSelect={(key) => set({ face: key })}
                />
                <div className={styles.sectionLabel}>Skin</div>
                <SwatchRow
                  options={skinColors}
                  value={draft.skinColor}
                  onSelect={(key) => set({ skinColor: key })}
                />
              </>
            )}

            {tab === "outfit" && (
              <>
                <div className={styles.sectionLabel}>Style</div>
                <ChipRow
                  options={outfitStyles}
                  value={draft.outfit}
                  onSelect={(key) => set({ outfit: key })}
                />
                <div className={styles.sectionLabel}>Color</div>
                <SwatchRow
                  options={outfitColors}
                  value={draft.outfitColor}
                  onSelect={(key) => set({ outfitColor: key })}
                />
              </>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.shuffleBtn}
              onClick={shuffle}
            >
              Shuffle
            </button>
            {canClose && (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={onClose}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onConfirm(draft)}
            >
              Enter world
            </button>
          </div>
        </div>
      </div>
      <div className={styles.crt} />
    </div>
  );
}

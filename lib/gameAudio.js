/**
 * Browser game audio: unlock on user gesture, one-shot footsteps, looping ambience.
 */

export const AUDIO = {
  footstepWood: "/audio/player/footstep-wood.wav",
  footstepGrass: "/audio/player/footstep-grass.wav",
  ambience: "/audio/ambiances/abeto-base.ogg",
};

const FOOTSTEP_VOLUME = 0.32;
const AMBIENCE_VOLUME = 0.25;
const MIN_MOVING_FOR_STEP = 0.12;

let ctx = null;
let unlocked = false;
let footstepBuffer = null;
let ambienceBuffer = null;
let ambienceSource = null;
let ambienceGain = null;
let loadPromise = null;

async function loadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
  const data = await res.arrayBuffer();
  return ctx.decodeAudioData(data);
}

async function ensureLoaded() {
  if (!ctx) ctx = new AudioContext();
  if (footstepBuffer && ambienceBuffer) return;

  if (!loadPromise) {
    loadPromise = Promise.all([
      loadBuffer(AUDIO.footstepGrass),
      loadBuffer(AUDIO.ambience),
    ]).then(([foot, amb]) => {
      footstepBuffer = foot;
      ambienceBuffer = amb;
    });
  }
  await loadPromise;
}

export async function unlockGameAudio() {
  if (unlocked) return;
  await ensureLoaded();
  if (ctx.state === "suspended") await ctx.resume();
  unlocked = true;
  startAmbience();
}

function startAmbience() {
  if (!ctx || !ambienceBuffer || ambienceSource) return;

  ambienceSource = ctx.createBufferSource();
  ambienceSource.buffer = ambienceBuffer;
  ambienceSource.loop = true;

  ambienceGain = ctx.createGain();
  ambienceGain.gain.value = 0;
  ambienceSource.connect(ambienceGain);
  ambienceGain.connect(ctx.destination);
  ambienceSource.start();

  const t = ctx.currentTime;
  ambienceGain.gain.setValueAtTime(0, t);
  ambienceGain.gain.linearRampToValueAtTime(AMBIENCE_VOLUME, t + 1.5);
}

function stopAmbience() {
  if (!ambienceGain || !ctx) return;
  const t = ctx.currentTime;
  ambienceGain.gain.cancelScheduledValues(t);
  ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, t);
  ambienceGain.gain.linearRampToValueAtTime(0, t + 0.4);
  const source = ambienceSource;
  ambienceSource = null;
  setTimeout(() => {
    try {
      source?.stop();
    } catch {
      /* already stopped */
    }
  }, 450);
}

/** One-shot footstep; call when move bob hits a step boundary. */
export function playFootstep(moving01 = 1) {
  if (!unlocked || !ctx || !footstepBuffer) return;
  if (moving01 < MIN_MOVING_FOR_STEP) return;

  const src = ctx.createBufferSource();
  src.buffer = footstepBuffer;

  const gain = ctx.createGain();
  const vol = FOOTSTEP_VOLUME * Math.min(1, moving01);
  gain.gain.value = vol;

  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function setAudioMuted(muted) {
  if (!ctx) return;
  if (muted) {
    stopAmbience();
    if (ctx.state === "running") ctx.suspend();
  } else if (unlocked) {
    ctx.resume();
    startAmbience();
  }
}

// One footstep per full bob cycle (2π), not per half-cycle (π).
const STEP_PHASE_RADIANS = Math.PI * 2;

/** Detect each foot-down from continuous move phase (radians). */
export function consumeStepTicks(phase, lastStepIndexRef, moving01) {
  const stepIndex = Math.floor(phase / STEP_PHASE_RADIANS);

  if (moving01 < MIN_MOVING_FOR_STEP) {
    lastStepIndexRef.current = stepIndex;
    return;
  }

  if (stepIndex > lastStepIndexRef.current) {
    lastStepIndexRef.current = stepIndex;
    playFootstep(moving01);
  }
}

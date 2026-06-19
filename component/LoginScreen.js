"use client";

import { useState } from "react";
import styles from "@/component/OnboardingShell.module.scss";

export default function LoginScreen({ onGuest, onGoogle }) {
  const [busy, setBusy] = useState(false);

  async function handleGuest() {
    if (busy) return;
    setBusy(true);
    try {
      await onGuest();
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      await onGoogle();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Welcome to Soresore</h1>
        <p className={styles.subtitle}>
          Sign in to create your villager, or wander the station as a cozy guest
          cat.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={handleGoogle}
          >
            Sign in with Google
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={busy}
            onClick={handleGuest}
          >
            Continue as guest
          </button>
        </div>
      </div>
      <div className={styles.crt} />
    </div>
  );
}

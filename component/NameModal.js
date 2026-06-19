"use client";

import { useState } from "react";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  validateDisplayName,
} from "@/lib/playerIdentity";
import styles from "@/component/OnboardingShell.module.scss";

const ERROR_MESSAGES = {
  too_short: `Name must be at least ${DISPLAY_NAME_MIN} characters.`,
  too_long: `Name must be at most ${DISPLAY_NAME_MAX} characters.`,
  invalid_chars: "Use letters, numbers, spaces, hyphens, or underscores only.",
  taken: "That name is taken — try another.",
  unknown: "Could not save your name. Please try again.",
};

export default function NameModal({ onSubmit }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    const validation = validateDisplayName(draft);
    if (validation) {
      setError(ERROR_MESSAGES[validation]);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(draft.trim());
      if (result) {
        setError(ERROR_MESSAGES[result] ?? ERROR_MESSAGES.unknown);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Choose your name</h1>
        <p className={styles.subtitle}>
          This is how other villagers will see you. You can&apos;t change it
          later.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            className={styles.textInput}
            type="text"
            value={draft}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="Your villager name"
            autoFocus
            disabled={busy}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
          />
          {error && <p className={styles.error}>{error}</p>}
          <p className={styles.hint}>
            {DISPLAY_NAME_MIN}–{DISPLAY_NAME_MAX} characters
          </p>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={busy || !draft.trim()}
          >
            Continue
          </button>
        </form>
      </div>
      <div className={styles.crt} />
    </div>
  );
}

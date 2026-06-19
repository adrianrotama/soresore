"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_MESSAGE_LENGTH,
  senderLabel,
  trimPanelMessages,
} from "@/lib/chat";
import styles from "@/component/ChatPanel.module.scss";

export default function ChatPanel({
  messages,
  playerId,
  displayName,
  onSend,
  onTypingChange,
  ready = true,
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [barHovered, setBarHovered] = useState(false);
  const logRef = useRef(null);

  function scrollLogToEnd() {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }

  useEffect(() => {
    scrollLogToEnd();
  }, [messages]);

  // After collapsing, re-scroll once height animation finishes.
  useEffect(() => {
    if (focused) return;
    scrollLogToEnd();
    const timer = window.setTimeout(scrollLogToEnd, 300);
    return () => window.clearTimeout(timer);
  }, [focused]);

  function handleSubmit(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !ready || !playerId) return;
    onSend(body.slice(0, MAX_MESSAGE_LENGTH));
    setDraft("");
  }

  function handleFocus() {
    setFocused(true);
    onTypingChange?.(true);
  }

  function handleBlur() {
    setFocused(false);
    onTypingChange?.(false);
    requestAnimationFrame(scrollLogToEnd);
  }

  const panelMessages = trimPanelMessages(messages);
  const displayMessages = focused
    ? panelMessages
    : panelMessages.slice(-2);
  const canSend = ready && Boolean(playerId);

  return (
    <div
      className={`${styles.wrapper} ${focused ? styles.wrapperFocused : ""} ${
        barHovered && !focused ? styles.wrapperHovered : ""
      }`}
    >
      <div className={styles.log} ref={logRef}>
        {displayMessages.length === 0 ? (
          <div className={styles.empty}>Say hi — bubbles show when you&apos;re nearby.</div>
        ) : (
          displayMessages.map((message) => {
            const isSelf = message.senderId === playerId;
            const name = senderLabel(message.senderId, playerId, displayName);
            return (
              <div
                key={message.id}
                className={`${styles.line} ${isSelf ? styles.self : ""}`}
              >
                <span className={styles.name}>{name}:</span> {message.body}
              </div>
            );
          })
        )}
      </div>

      <form
        className={styles.bar}
        onSubmit={handleSubmit}
        onMouseEnter={() => setBarHovered(true)}
        onMouseLeave={() => setBarHovered(false)}
      >
        <input
          className={styles.input}
          type="text"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={!playerId ? "Connecting…" : "Type a message…"}
          disabled={!canSend}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <button
          className={styles.send}
          type="submit"
          disabled={!canSend || !draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

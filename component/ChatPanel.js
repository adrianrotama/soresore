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
  players = {},
  onSend,
  onTypingChange,
  ready = true,
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [barHovered, setBarHovered] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

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

  const canSend = ready && Boolean(playerId);

  function blurInput() {
    inputRef.current?.blur();
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return;

      const isEscape = e.key === "Escape" || e.code === "Escape";

      if (isEscape) {
        if (!focused) return;
        e.preventDefault();
        e.stopPropagation();
        blurInput();
        return;
      }

      if (e.key !== "Enter") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!canSend) return;
      e.preventDefault();
      inputRef.current?.focus();
    }

    // Capture phase — runs before OrbitControls / canvas eat Escape on Mac.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [canSend, focused]);

  function handleInputKeyDown(e) {
    if (e.key !== "Escape" && e.code !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    blurInput();
  }

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
            const name = senderLabel(
              message.senderId,
              playerId,
              displayName,
              players[message.senderId]?.display_name
            );
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
          ref={inputRef}
          className={styles.input}
          type="text"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={!playerId ? "Connecting…" : "Press enter to send a message.."}
          disabled={!canSend}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleInputKeyDown}
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

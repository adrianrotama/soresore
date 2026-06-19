/** XZ distance within which 3D chat bubbles appear. */
export const CHAT_RADIUS = 10;

/** How long a bubble stays visible after send. */
export const BUBBLE_TTL_MS = 10_000;

export const PANEL_MAX_LINES = 50;
export const MAX_MESSAGE_LENGTH = 140;

export function messageFromRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function xzDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function isWithinChatRange(myPos, theirPos) {
  return xzDistance(myPos, theirPos) <= CHAT_RADIUS;
}

export function isBubbleActive(message, now = Date.now()) {
  return now - new Date(message.createdAt).getTime() < BUBBLE_TTL_MS;
}

/** Most recent non-expired message from sender, if viewer is in range. */
export function getActiveBubbleMessage(
  messages,
  senderId,
  myPos,
  senderPos,
  now = Date.now()
) {
  if (!senderPos || !isWithinChatRange(myPos, senderPos)) return null;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.senderId !== senderId) continue;
    if (!isBubbleActive(message, now)) continue;
    return message;
  }

  return null;
}

export function trimPanelMessages(messages) {
  if (messages.length <= PANEL_MAX_LINES) return messages;
  return messages.slice(-PANEL_MAX_LINES);
}

export function senderLabel(senderId, localPlayerId, localDisplayName) {
  if (senderId === localPlayerId) return localDisplayName;
  return `Guest-${senderId.slice(0, 4)}`;
}

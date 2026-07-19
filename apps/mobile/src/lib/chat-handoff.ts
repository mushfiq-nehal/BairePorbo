/**
 * One-shot handoff of the session picked on the chat history screen.
 *
 * The history screen navigates back to the already-mounted chat screen, and
 * expo-router's dismissTo/POP_TO does not deliver fresh params to a mounted
 * route — so the chat screen consumes the picked id from here on focus.
 */
let pendingSessionId: string | null = null;

export function setPendingChatSession(id: string) {
  pendingSessionId = id;
}

export function consumePendingChatSession(): string | null {
  const id = pendingSessionId;
  pendingSessionId = null;
  return id;
}

export interface BotSession {
  userId: number;
  username?: string;
  currentModel: string;
  conversationHistory: Array<{ role: string; content: string }>;
  createdAt: Date;
  lastActive: Date;
}

// In-memory store
// Note: Sessions reset on cold starts (Vercel serverless)
// For persistent sessions, use Vercel KV or database
const sessions = new Map<number, BotSession>();

const DEFAULT_MODEL = "llama-3.3-70b";
const MAX_HISTORY = 20;
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

export function getSession(userId: number): BotSession {
  const existing = sessions.get(userId);
  if (existing) {
    existing.lastActive = new Date();
    return existing;
  }

  const session: BotSession = {
    userId,
    currentModel: DEFAULT_MODEL,
    conversationHistory: [],
    createdAt: new Date(),
    lastActive: new Date(),
  };

  sessions.set(userId, session);
  cleanupOldSessions();
  return session;
}

export function clearSession(userId: number): void {
  sessions.delete(userId);
}

export function updateModel(userId: number, model: string): void {
  const session = getSession(userId);
  session.currentModel = model;
}

export function addMessage(
  userId: number,
  role: "user" | "assistant",
  content: string,
): void {
  const session = getSession(userId);
  session.conversationHistory.push({ role, content });
  if (session.conversationHistory.length > MAX_HISTORY) {
    session.conversationHistory = session.conversationHistory.slice(
      -MAX_HISTORY,
    );
  }
}

export function getHistory(userId: number) {
  return getSession(userId).conversationHistory;
}

function cleanupOldSessions(): void {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now - session.lastActive.getTime() > SESSION_TTL) {
      sessions.delete(userId);
    }
  }
}

export interface BotSession {
  userId: number;
  username?: string;
  currentModel: string;
  conversationHistory: Array<{ role: string; content: string }>;
  createdAt: Date;
  lastActive: Date;
}

const sessions = new Map<number, BotSession>();

export function getSession(userId: number): BotSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      currentModel: "gpt-4o-mini",
      conversationHistory: [],
      createdAt: new Date(),
      lastActive: new Date(),
    });
  }
  const session = sessions.get(userId)!;
  session.lastActive = new Date();
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
  if (session.conversationHistory.length > 20) {
    session.conversationHistory = session.conversationHistory.slice(-20);
  }
}

export function getHistory(userId: number) {
  return getSession(userId).conversationHistory;
}

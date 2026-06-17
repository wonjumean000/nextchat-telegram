import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export interface BotSession {
  userId: number;
  username?: string;
  currentModel: string;
  conversationHistory: Array<{ role: string; content: string }>;
  createdAt: string;
  lastActive: string;
}

const SESSION_PREFIX = "bot:session:";
const SESSION_TTL = 30 * 60; // 30 minutes

function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// In-memory fallback when Redis is not configured
const memorySessions = new Map<number, BotSession>();

export async function getSession(userId: number): Promise<BotSession> {
  if (isRedisConfigured()) {
    const key = `${SESSION_PREFIX}${userId}`;
    const existing = await redis.get<BotSession>(key);

    if (existing) {
      existing.lastActive = new Date().toISOString();
      await redis.set(key, existing, { ex: SESSION_TTL });
      return existing;
    }

    const session: BotSession = {
      userId,
      currentModel: "llama-3.3-70b",
      conversationHistory: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await redis.set(key, session, { ex: SESSION_TTL });
    return session;
  }

  // Fallback to memory
  const existing = memorySessions.get(userId);
  if (existing) {
    existing.lastActive = new Date().toISOString();
    return existing;
  }

  const session: BotSession = {
    userId,
    currentModel: "llama-3.3-70b",
    conversationHistory: [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  memorySessions.set(userId, session);
  return session;
}

export async function clearSession(userId: number): Promise<void> {
  if (isRedisConfigured()) {
    await redis.del(`${SESSION_PREFIX}${userId}`);
  } else {
    memorySessions.delete(userId);
  }
}

export async function updateModel(
  userId: number,
  model: string,
): Promise<void> {
  const session = await getSession(userId);
  session.currentModel = model;

  if (isRedisConfigured()) {
    await redis.set(`${SESSION_PREFIX}${userId}`, session, { ex: SESSION_TTL });
  } else {
    memorySessions.set(userId, session);
  }
}

export async function addMessage(
  userId: number,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const session = await getSession(userId);
  session.conversationHistory.push({ role, content });
  if (session.conversationHistory.length > 20) {
    session.conversationHistory = session.conversationHistory.slice(-20);
  }

  if (isRedisConfigured()) {
    await redis.set(`${SESSION_PREFIX}${userId}`, session, { ex: SESSION_TTL });
  } else {
    memorySessions.set(userId, session);
  }
}

export async function getHistory(userId: number) {
  const session = await getSession(userId);
  return session.conversationHistory;
}

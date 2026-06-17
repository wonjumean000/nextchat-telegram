import axios from "axios";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  model: string;
  provider: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

let cachedModels: ModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

function getProviderConfig(provider: string) {
  const configs: Record<string, { baseUrl: string; apiKeyEnv: string }> = {
    OrcaRouter: {
      baseUrl: process.env.ORCAROUTER_URL || "https://api.orcarouter.com",
      apiKeyEnv: "ORCAROUTER_API_KEY",
    },
    Venice: {
      baseUrl: process.env.VENICE_URL || "https://api.venice.ai",
      apiKeyEnv: "VENICE_API_KEY",
    },
    GPT: {
      baseUrl: process.env.BASE_URL || "https://api.openai.com",
      apiKeyEnv: "OPENAI_API_KEY",
    },
    Claude: {
      baseUrl: process.env.ANTHROPIC_URL || "https://api.anthropic.com",
      apiKeyEnv: "ANTHROPIC_API_KEY",
    },
    GeminiPro: {
      baseUrl:
        process.env.GOOGLE_URL || "https://generativelanguage.googleapis.com/",
      apiKeyEnv: "GOOGLE_API_KEY",
    },
    DeepSeek: {
      baseUrl: process.env.DEEPSEEK_URL || "https://api.deepseek.com",
      apiKeyEnv: "DEEPSEEK_API_KEY",
    },
  };
  return configs[provider] || configs.OrcaRouter;
}

export async function fetchModels(provider?: string): Promise<ModelInfo[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  const allModels: ModelInfo[] = [];

  // Fetch from both providers
  const providers = ["OrcaRouter", "Venice"];
  for (const p of providers) {
    const config = getProviderConfig(p);
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) continue;

    try {
      const response = await axios.get(`${config.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });

      const models = (response.data.data || response.data || []).map(
        (m: any) => ({
          id: m.id,
          name: m.name || m.id,
          provider: p,
        }),
      );
      allModels.push(...models);
    } catch {
      // Skip failed provider
    }
  }

  if (allModels.length > 0) {
    cachedModels = allModels;
    cacheTimestamp = now;
    return allModels;
  }

  return getDefaultModels();
}

function getDefaultModels(): ModelInfo[] {
  return [
    { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "OrcaRouter" },
    { id: "llama-3.1-405b", name: "Llama 3.1 405B", provider: "OrcaRouter" },
    { id: "mistral-large", name: "Mistral Large", provider: "OrcaRouter" },
    { id: "qwen-2.5-72b", name: "Qwen 2.5 72B", provider: "OrcaRouter" },
    { id: "deepseek-r1", name: "DeepSeek R1", provider: "OrcaRouter" },
    { id: "gemma-2-27b", name: "Gemma 2 27B", provider: "OrcaRouter" },
    { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Venice" },
    { id: "llama-3.1-405b", name: "Llama 3.1 405B", provider: "Venice" },
    { id: "mistral-large", name: "Mistral Large", provider: "Venice" },
  ];
}

// Compress messages to reduce token usage
function compressMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 4) return messages;

  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // Keep system messages + last 10 chat messages
  const recentMessages = chatMessages.slice(-10);

  // Summarize older messages if needed
  if (chatMessages.length > 10) {
    const olderMessages = chatMessages.slice(0, -10);
    const summary = olderMessages
      .map((m) => `${m.role}: ${m.content.substring(0, 100)}`)
      .join("\n");

    return [
      ...systemMessages,
      {
        role: "system",
        content: `Previous conversation summary:\n${summary}`,
      },
      ...recentMessages,
    ];
  }

  return [...systemMessages, ...recentMessages];
}

export async function chatWithAI(options: ChatOptions): Promise<string> {
  const { messages, model, provider } = options;
  const config = getProviderConfig(provider);
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`Missing API key for provider: ${provider}`);
  }

  // Compress messages to save tokens
  const compressedMessages = compressMessages(messages);

  if (provider === "Claude") {
    const response = await axios.post(
      `${config.baseUrl}/v1/messages`,
      {
        model,
        messages: compressedMessages.filter((m) => m.role !== "system"),
        max_tokens: 4096,
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      },
    );
    return response.data.content[0].text;
  }

  if (provider === "GeminiPro") {
    const contents = compressedMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await axios.post(
      `${config.baseUrl}v1beta/models/${model}:generateContent?key=${apiKey}`,
      { contents },
      { headers: { "content-type": "application/json" } },
    );
    return response.data.candidates[0].content.parts[0].text;
  }

  // OpenAI-compatible APIs
  const response = await axios.post(
    `${config.baseUrl}/v1/chat/completions`,
    { model, messages: compressedMessages },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
    },
  );
  return response.data.choices[0].message.content;
}

export function getProviderFromModel(model: string): string {
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  return "OrcaRouter";
}

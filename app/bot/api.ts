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

function getProviderConfig(provider: string) {
  const configs: Record<string, { baseUrl: string; apiKeyEnv: string }> = {
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
    Qwen: {
      baseUrl: process.env.ALIBABA_URL || "https://dashscope.aliyuncs.com/api/",
      apiKeyEnv: "ALIBABA_API_KEY",
    },
  };
  return configs[provider] || configs.GPT;
}

export async function chatWithAI(options: ChatOptions): Promise<string> {
  const { messages, model, provider } = options;
  const config = getProviderConfig(provider);
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`Missing API key for provider: ${provider}`);
  }

  if (provider === "Claude") {
    const response = await axios.post(
      `${config.baseUrl}/v1/messages`,
      {
        model,
        messages: messages.filter((m) => m.role !== "system"),
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
    const contents = messages
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

  // OpenAI-compatible APIs (GPT, DeepSeek, Qwen, etc.)
  const response = await axios.post(
    `${config.baseUrl}/v1/chat/completions`,
    { model, messages },
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
  if (model.startsWith("gpt-")) return "GPT";
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  if (model.startsWith("deepseek-")) return "DeepSeek";
  if (model.startsWith("qwen-")) return "Qwen";
  return "GPT";
}

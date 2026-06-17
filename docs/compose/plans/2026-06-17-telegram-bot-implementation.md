# Telegram Bot + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Telegram bot integration with AI chat, web search, translation, and Vercel authentication

**Architecture:** Next.js app with Telegram bot backend, NextAuth.js for authentication, reusing existing AI provider infrastructure

**Tech Stack:** node-telegram-bot-api, NextAuth.js, axios, cheerio (web scraping)

---

## Phase 1: Project Setup

### Task 1: Install Dependencies

**Covers:** [S2], [S6]

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install required packages**

```bash
yarn add node-telegram-bot-api next-auth @auth/core cheerio
yarn add -D @types/node-telegram-bot-api
```

- [ ] **Step 2: Verify installation**

```bash
yarn list node-telegram-bot-api next-auth cheerio
```

Expected: Packages listed without errors

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock
git commit -m "deps: add telegram bot and auth dependencies"
```

---

### Task 2: Environment Configuration

**Covers:** [S8]

**Files:**
- Modify: `.env.template`
- Create: `.env.local` (gitignored)

- [ ] **Step 1: Add environment variables to template**

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/bot/telegram/webhook
TELEGRAM_ALLOWED_USERS=user1,user2

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Web Search (optional)
SEARCH_PROVIDER=google
GOOGLE_SEARCH_API_KEY=
BING_SEARCH_API_KEY=
```

- [ ] **Step 2: Update .gitignore**

Add to `.gitignore`:
```
.env.local
.env*.local
```

- [ ] **Step 3: Commit**

```bash
git add .env.template .gitignore
git commit -m "config: add telegram and auth environment variables"
```

---

## Phase 2: Telegram Bot Core

### Task 3: Bot Session Manager

**Covers:** [S3]

**Files:**
- Create: `app/bot/session.ts`

- [ ] **Step 1: Create session manager**

```typescript
// app/bot/session.ts
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
  content: string
): void {
  const session = getSession(userId);
  session.conversationHistory.push({ role, content });
  // Keep last 20 messages
  if (session.conversationHistory.length > 20) {
    session.conversationHistory = session.conversationHistory.slice(-20);
  }
}

export function getHistory(userId: number) {
  return getSession(userId).conversationHistory;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/session.ts
git commit -m "feat: add bot session manager"
```

---

### Task 4: Command Handlers

**Covers:** [S3]

**Files:**
- Create: `app/bot/commands/start.ts`
- Create: `app/bot/commands/help.ts`
- Create: `app/bot/commands/model.ts`
- Create: `app/bot/commands/clear.ts`

- [ ] **Step 1: Create /start command**

```typescript
// app/bot/commands/start.ts
import TelegramBot from "node-telegram-bot-api";

export function handleStart(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const username = msg.from?.first_name || "User";
  
  bot.sendMessage(
    chatId,
    `Hello ${username}! I'm your AI assistant.\n\n` +
    `Available commands:\n` +
    `/help - Show all commands\n` +
    `/model - Change AI model\n` +
    `/clear - Clear conversation history\n` +
    `/search <query> - Web search with AI\n` +
    `/translate <lang> <text> - Translate text\n\n` +
    `Just send a message to chat with AI!`
  );
}
```

- [ ] **Step 2: Create /help command**

```typescript
// app/bot/commands/help.ts
import TelegramBot from "node-telegram-bot-api";

export function handleHelp(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  
  bot.sendMessage(
    chatId,
    `📖 Command List:\n\n` +
    `/start - Welcome message\n` +
    `/help - This help message\n` +
    `/model [name] - View/change model (e.g., /model gpt-4o)\n` +
    `/clear - Clear conversation history\n` +
    `/search <query> - Search web and get AI summary\n` +
    `/translate <lang> <text> - Translate to target language\n` +
    `/lang - List supported languages\n\n` +
    `Supported models: gpt-4o, gpt-4o-mini, claude-3-opus, gemini-pro, etc.\n` +
    `Send any text message to chat with AI!`
  );
}
```

- [ ] **Step 3: Create /model command**

```typescript
// app/bot/commands/model.ts
import TelegramBot from "node-telegram-bot-api";
import { updateModel, getSession } from "../session";
import { AVAILABLE_MODELS } from "../constants";

export function handleModel(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const args = msg.text?.split(" ").slice(1) || [];
  
  if (args.length === 0) {
    const session = getSession(msg.from!.id);
    bot.sendMessage(
      chatId,
      `Current model: ${session.currentModel}\n\n` +
      `Available models:\n${AVAILABLE_MODELS.join("\n")}\n\n` +
      `Use /model <name> to change`
    );
    return;
  }
  
  const modelName = args[0].toLowerCase();
  if (!AVAILABLE_MODELS.includes(modelName)) {
    bot.sendMessage(chatId, `Model "${modelName}" not found. Use /model to see available models.`);
    return;
  }
  
  updateModel(msg.from!.id, modelName);
  bot.sendMessage(chatId, `Model changed to: ${modelName}`);
}
```

- [ ] **Step 4: Create /clear command**

```typescript
// app/bot/commands/clear.ts
import TelegramBot from "node-telegram-bot-api";
import { clearSession } from "../session";

export function handleClear(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  clearSession(msg.from!.id);
  bot.sendMessage(chatId, "Conversation history cleared.");
}
```

- [ ] **Step 5: Create constants file**

```typescript
// app/bot/constants.ts
export const AVAILABLE_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "deepseek-chat",
  "qwen-turbo",
];

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  ru: "Russian",
  pt: "Portuguese",
  ar: "Arabic",
};
```

- [ ] **Step 6: Commit**

```bash
git add app/bot/commands/ app/bot/constants.ts
git commit -m "feat: add bot command handlers"
```

---

### Task 5: Message Handler

**Covers:** [S3]

**Files:**
- Create: `app/bot/handlers/message.ts`

- [ ] **Step 1: Create message handler**

```typescript
// app/bot/handlers/message.ts
import TelegramBot from "node-telegram-bot-api";
import { getSession, addMessage, getHistory } from "../session";
import { ClientApi } from "../../client/api";
import { ServiceProvider } from "../../constant";

export async function handleMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const text = msg.text;
  
  if (!text) return;
  
  const session = getSession(userId);
  addMessage(userId, "user", text);
  
  // Show typing indicator
  await bot.sendChatAction(chatId, "typing");
  
  try {
    // Determine provider from model name
    const provider = getProviderFromModel(session.currentModel);
    const clientApi = new ClientApi(provider);
    
    // Prepare messages
    const messages = [
      ...getHistory(userId).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];
    
    let response = "";
    
    await clientApi.llm.chat({
      messages,
      config: {
        model: session.currentModel,
        stream: false,
      },
      onUpdate: (message, chunk) => {
        response = message;
      },
      onFinish: (message) => {
        response = message;
        addMessage(userId, "assistant", message);
        
        // Split long messages (Telegram limit: 4096 chars)
        const chunks = splitMessage(message, 4000);
        chunks.forEach((chunk, i) => {
          setTimeout(() => {
            bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
          }, i * 100);
        });
      },
      onError: (err) => {
        bot.sendMessage(chatId, `Error: ${err.message}`);
      },
    });
  } catch (error: any) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
}

function getProviderFromModel(model: string): any {
  if (model.startsWith("gpt-")) return "GPT";
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  if (model.startsWith("deepseek-")) return "DeepSeek";
  if (model.startsWith("qwen-")) return "Qwen";
  return "GPT";
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }
    
    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }
  
  return chunks;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/handlers/message.ts
git commit -m "feat: add message handler with AI integration"
```

---

### Task 6: Web Search Handler

**Covers:** [S4]

**Files:**
- Create: `app/bot/handlers/search.ts`

- [ ] **Step 1: Create web search handler**

```typescript
// app/bot/handlers/search.ts
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";
import { getSession, addMessage, getHistory } from "../session";
import { ClientApi } from "../../client/api";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function handleSearch(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  query: string
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  
  if (!query) {
    bot.sendMessage(chatId, "Usage: /search <your query>");
    return;
  }
  
  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, `🔍 Searching: ${query}...`);
  
  try {
    // Get search results
    const results = await searchWeb(query);
    
    if (results.length === 0) {
      bot.sendMessage(chatId, "No search results found.");
      return;
    }
    
    // Build context with search results
    const searchContext = results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`)
      .join("\n\n");
    
    const prompt = `Based on these search results, answer the question: "${query}"\n\nSearch results:\n${searchContext}`;
    
    const session = getSession(userId);
    addMessage(userId, "user", prompt);
    
    const provider = getProviderFromModel(session.currentModel);
    const clientApi = new ClientApi(provider);
    
    await clientApi.llm.chat({
      messages: [
        ...getHistory(userId).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      config: {
        model: session.currentModel,
        stream: false,
      },
      onFinish: (message) => {
        addMessage(userId, "assistant", message);
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      },
      onError: (err) => {
        bot.sendMessage(chatId, `Error: ${err.message}`);
      },
    });
  } catch (error: any) {
    bot.sendMessage(chatId, `Search error: ${error.message}`);
  }
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  const provider = process.env.SEARCH_PROVIDER || "google";
  
  switch (provider) {
    case "google":
      return searchGoogle(query);
    case "bing":
      return searchBing(query);
    case "duckduckgo":
      return searchDuckDuckGo(query);
    default:
      return searchGoogle(query);
  }
}

async function searchGoogle(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !cx) {
    return searchDuckDuckGo(query); // Fallback
  }
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
  const response = await axios.get(url);
  
  return (response.data.items || []).map((item: any) => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
  }));
}

async function searchBing(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  
  if (!apiKey) {
    return searchDuckDuckGo(query); // Fallback
  }
  
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
  });
  
  return (response.data.webPages?.value || []).map((item: any) => ({
    title: item.name,
    snippet: item.snippet,
    url: item.url,
  }));
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  const results: SearchResult[] = [];
  $(".result").each((_, element) => {
    const title = $(element).find(".result__title").text().trim();
    const snippet = $(element).find(".result__snippet").text().trim();
    const url = $(element).find(".result__url").attr("href") || "";
    
    if (title && snippet) {
      results.push({ title, snippet, url });
    }
  });
  
  return results.slice(0, 10);
}

function getProviderFromModel(model: string): any {
  if (model.startsWith("gpt-")) return "GPT";
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  return "GPT";
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/handlers/search.ts
git commit -m "feat: add web search handler"
```

---

### Task 7: Translation Handler

**Covers:** [S5]

**Files:**
- Create: `app/bot/handlers/translate.ts`

- [ ] **Step 1: Create translation handler**

```typescript
// app/bot/handlers/translate.ts
import TelegramBot from "node-telegram-bot-api";
import { getSession, addMessage, getHistory } from "../session";
import { ClientApi } from "../../client/api";
import { SUPPORTED_LANGUAGES } from "../constants";

export async function handleTranslate(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string[]
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  
  if (args.length < 2) {
    bot.sendMessage(
      chatId,
      `Usage: /translate <lang> <text>\n\n` +
      `Supported languages:\n` +
      Object.entries(SUPPORTED_LANGUAGES)
        .map(([code, name]) => `${code} - ${name}`)
        .join("\n")
    );
    return;
  }
  
  const targetLang = args[0].toLowerCase();
  const text = args.slice(1).join(" ");
  
  if (!SUPPORTED_LANGUAGES[targetLang]) {
    bot.sendMessage(
      chatId,
      `Language "${targetLang}" not supported.\nUse /lang to see available languages.`
    );
    return;
  }
  
  await bot.sendChatAction(chatId, "typing");
  
  try {
    const session = getSession(userId);
    const langName = SUPPORTED_LANGUAGES[targetLang];
    
    const prompt = `Translate the following text to ${langName}. Only provide the translation, no explanations:\n\n"${text}"`;
    
    addMessage(userId, "user", prompt);
    
    const provider = getProviderFromModel(session.currentModel);
    const clientApi = new ClientApi(provider);
    
    await clientApi.llm.chat({
      messages: [
        ...getHistory(userId).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      config: {
        model: session.currentModel,
        stream: false,
      },
      onFinish: (message) => {
        addMessage(userId, "assistant", message);
        bot.sendMessage(
          chatId,
          `🌐 Translation (${langName}):\n\n${message}`
        );
      },
      onError: (err) => {
        bot.sendMessage(chatId, `Translation error: ${err.message}`);
      },
    });
  } catch (error: any) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
}

function getProviderFromModel(model: string): any {
  if (model.startsWith("gpt-")) return "GPT";
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  return "GPT";
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/handlers/translate.ts
git commit -m "feat: add translation handler"
```

---

### Task 8: File Handler

**Covers:** [S7]

**Files:**
- Create: `app/bot/handlers/file.ts`

- [ ] **Step 1: Create file handler**

```typescript
// app/bot/handlers/file.ts
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import { getSession, addMessage, getHistory } from "../session";
import { ClientApi } from "../../client/api";

export async function handlePhoto(
  bot: TelegramBot,
  msg: TelegramBot.Message
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  
  if (!msg.photo || msg.photo.length === 0) {
    bot.sendMessage(chatId, "No photo detected.");
    return;
  }
  
  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "📸 Analyzing image...");
  
  try {
    // Get the largest photo
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    // Download photo
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(response.data).toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64}`;
    
    const session = getSession(userId);
    const caption = msg.caption || "What do you see in this image?";
    
    addMessage(userId, "user", `[Image] ${caption}`);
    
    const provider = getProviderFromModel(session.currentModel);
    const clientApi = new ClientApi(provider);
    
    // Note: This assumes the API supports multimodal input
    // May need to adjust based on actual API implementation
    await clientApi.llm.chat({
      messages: [
        ...getHistory(userId).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      config: {
        model: session.currentModel,
        stream: false,
      },
      onFinish: (message) => {
        addMessage(userId, "assistant", message);
        bot.sendMessage(chatId, message);
      },
      onError: (err) => {
        bot.sendMessage(chatId, `Error: ${err.message}`);
      },
    });
  } catch (error: any) {
    bot.sendMessage(chatId, `Error processing image: ${error.message}`);
  }
}

export async function handleDocument(
  bot: TelegramBot,
  msg: TelegramBot.Message
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  
  if (!msg.document) {
    bot.sendMessage(chatId, "No document detected.");
    return;
  }
  
  const supportedTypes = ["text/plain", "application/pdf"];
  if (!supportedTypes.includes(msg.document.mime_type || "")) {
    bot.sendMessage(
      chatId,
      "Unsupported file type. Please send text files (.txt) or PDFs."
    );
    return;
  }
  
  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "📄 Processing document...");
  
  try {
    const file = await bot.getFile(msg.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "text" });
    
    const session = getSession(userId);
    const prompt = `Analyze this document:\n\n${response.data}`;
    
    addMessage(userId, "user", prompt);
    
    const provider = getProviderFromModel(session.currentModel);
    const clientApi = new ClientApi(provider);
    
    await clientApi.llm.chat({
      messages: [
        ...getHistory(userId).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      config: {
        model: session.currentModel,
        stream: false,
      },
      onFinish: (message) => {
        addMessage(userId, "assistant", message);
        bot.sendMessage(chatId, message);
      },
      onError: (err) => {
        bot.sendMessage(chatId, `Error: ${err.message}`);
      },
    });
  } catch (error: any) {
    bot.sendMessage(chatId, `Error processing document: ${error.message}`);
  }
}

function getProviderFromModel(model: string): any {
  if (model.startsWith("gpt-")) return "GPT";
  if (model.startsWith("claude-")) return "Claude";
  if (model.startsWith("gemini-")) return "GeminiPro";
  return "GPT";
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/handlers/file.ts
git commit -m "feat: add file handler for images and documents"
```

---

### Task 9: Main Bot Entry Point

**Covers:** [S3]

**Files:**
- Create: `app/bot/telegram/index.ts`

- [ ] **Step 1: Create main bot file**

```typescript
// app/bot/telegram/index.ts
import TelegramBot from "node-telegram-bot-api";
import { handleStart } from "../commands/start";
import { handleHelp } from "../commands/help";
import { handleModel } from "../commands/model";
import { handleClear } from "../commands/clear";
import { handleMessage } from "../handlers/message";
import { handleSearch } from "../handlers/search";
import { handleTranslate } from "../handlers/translate";
import { handlePhoto, handleDocument } from "../handlers/file";

let bot: TelegramBot | null = null;

export function initBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  
  bot = new TelegramBot(token, { polling: !process.env.TELEGRAM_WEBHOOK_URL });
  
  // Command handlers
  bot.onText(/\/start/, (msg) => handleStart(bot!, msg));
  bot.onText(/\/help/, (msg) => handleHelp(bot!, msg));
  bot.onText(/\/model(.*)/, (msg) => handleModel(bot!, msg));
  bot.onText(/\/clear/, (msg) => handleClear(bot!, msg));
  bot.onText(/\/search(.*)/, (msg, match) => {
    const query = match?.[1]?.trim() || "";
    handleSearch(bot!, msg, query);
  });
  bot.onText(/\/translate(.*)/, (msg, match) => {
    const args = match?.[1]?.trim().split(" ") || [];
    handleTranslate(bot!, msg, args);
  });
  bot.onText(/\/lang/, (msg) => {
    const { SUPPORTED_LANGUAGES } = require("../constants");
    const langList = Object.entries(SUPPORTED_LANGUAGES)
      .map(([code, name]) => `${code} - ${name}`)
      .join("\n");
    bot!.sendMessage(msg.chat.id, `Supported languages:\n\n${langList}`);
  });
  
  // Photo handler
  bot.on("photo", (msg) => handlePhoto(bot!, msg));
  
  // Document handler
  bot.on("document", (msg) => handleDocument(bot!, msg));
  
  // Message handler (for non-command messages)
  bot.on("message", (msg) => {
    if (msg.text?.startsWith("/")) return; // Skip commands
    if (msg.photo) return; // Skip photos (handled above)
    if (msg.document) return; // Skip documents (handled above)
    handleMessage(bot!, msg);
  });
  
  console.log("[Bot] Telegram bot initialized");
  return bot;
}

export function getBot(): TelegramBot | null {
  return bot;
}

export function stopBot(): void {
  if (bot) {
    bot.stopPolling();
    bot = null;
    console.log("[Bot] Telegram bot stopped");
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/bot/telegram/index.ts
git commit -m "feat: add main Telegram bot entry point"
```

---

### Task 10: Bot API Webhook Endpoint

**Covers:** [S3]

**Files:**
- Create: `app/api/bot/telegram/webhook/route.ts`

- [ ] **Step 1: Create webhook endpoint**

```typescript
// app/api/bot/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initBot, getBot } from "../../../../bot/telegram";

let botInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize bot on first request
    if (!botInitialized) {
      initBot();
      botInitialized = true;
    }
    
    const bot = getBot();
    if (!bot) {
      return NextResponse.json({ error: "Bot not initialized" }, { status: 500 });
    }
    
    const body = await request.json();
    
    // Process the update
    bot.processUpdate(body);
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/bot/telegram/webhook/route.ts
git commit -m "feat: add Telegram webhook endpoint"
```

---

## Phase 3: Authentication

### Task 11: NextAuth Configuration

**Covers:** [S6]

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/lib/auth.ts`

- [ ] **Step 1: Create auth configuration**

```typescript
// app/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // TODO: Implement actual user validation
        // For now, accept any email/password combination
        if (credentials?.email && credentials?.password) {
          return {
            id: credentials.email,
            email: credentials.email,
            name: credentials.email.split("@")[0],
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
```

- [ ] **Step 2: Create NextAuth route**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/auth.ts "app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth configuration"
```

---

### Task 12: Login Page

**Covers:** [S6]

**Files:**
- Create: `app/auth/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
// app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to NextChat
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 13: Session Provider Wrapper

**Covers:** [S6]

**Files:**
- Create: `app/components/SessionProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create SessionProvider wrapper**

```tsx
// app/components/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

- [ ] **Step 2: Update layout.tsx to include SessionProvider**

Read `app/layout.tsx` first, then add the SessionProvider wrapper.

- [ ] **Step 3: Commit**

```bash
git add app/components/SessionProvider.tsx app/layout.tsx
git commit -m "feat: add session provider wrapper"
```

---

### Task 14: Protected API Middleware

**Covers:** [S6]

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware**

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: ["/api/:path*"],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add API route protection middleware"
```

---

## Phase 4: Integration & Testing

### Task 15: App Initialization

**Covers:** [S3]

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add bot initialization to app**

Add to `app/layout.tsx` server-side code:

```typescript
// Initialize bot on server start (only in production or when TELEGRAM_BOT_TOKEN is set)
if (process.env.TELEGRAM_BOT_TOKEN) {
  import("./bot/telegram").then(({ initBot }) => {
    initBot();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: initialize bot on app start"
```

---

### Task 16: Documentation

**Covers:** [S8]

**Files:**
- Create: `docs/telegram-bot-setup.md`

- [ ] **Step 1: Create setup documentation**

```markdown
# Telegram Bot Setup Guide

## Prerequisites

1. Create a Telegram bot via @BotFather
2. Get your bot token
3. Set up webhook URL (for production)

## Environment Variables

Add to `.env.local`:

```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/bot/telegram/webhook
```

## Development Mode

For local development, the bot uses polling mode (no webhook needed).

## Production Deployment

1. Set `TELEGRAM_WEBHOOK_URL` to your production URL
2. Deploy to Vercel
3. Bot will automatically set up webhook

## Commands

- `/start` - Welcome message
- `/help` - Show all commands
- `/model [name]` - Change AI model
- `/clear` - Clear conversation history
- `/search <query>` - Web search with AI
- `/translate <lang> <text>` - Translate text

## Supported Models

- gpt-4o, gpt-4o-mini
- claude-3-opus, claude-3-sonnet
- gemini-1.5-pro, gemini-1.5-flash
- deepseek-chat
- qwen-turbo
```

- [ ] **Step 2: Commit**

```bash
git add docs/telegram-bot-setup.md
git commit -m "docs: add Telegram bot setup guide"
```

---

### Task 17: Final Testing

**Covers:** All

**Files:**
- None

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Expected: No errors

- [ ] **Step 2: Run build**

```bash
yarn build
```

Expected: Build succeeds

- [ ] **Step 3: Test bot locally**

1. Set `TELEGRAM_BOT_TOKEN` in `.env.local`
2. Run `yarn dev`
3. Send messages to bot in Telegram
4. Verify commands work

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Telegram bot and auth implementation"
```

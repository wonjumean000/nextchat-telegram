import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import axios from "axios";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function handleSearch(
  bot: TelegramBot,
  msg: Message,
  query: string,
) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  if (!query) {
    bot.sendMessage(chatId, "Usage: /search <your query>");
    return;
  }

  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, `Searching: ${query}...`);

  try {
    const results = await searchWeb(query);

    if (results.length === 0) {
      bot.sendMessage(chatId, "No search results found.");
      return;
    }

    const searchContext = results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`)
      .join("\n\n");

    const prompt = `Based on these search results, answer the question: "${query}"\n\nSearch results:\n${searchContext}`;

    const session = getSession(userId);
    addMessage(userId, "user", prompt);

    const provider = getProviderFromModel(session.currentModel);
    const messages = getHistory(userId).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await chatWithAI({
      messages,
      model: session.currentModel,
      provider,
    });

    addMessage(userId, "assistant", response);
    bot.sendMessage(chatId, response);
  } catch (error: any) {
    bot.sendMessage(chatId, `Search error: ${error.message}`);
  }
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query,
      )}&format=json&no_html=1`,
      { timeout: 5000 },
    );

    const results: SearchResult[] = [];

    if (response.data.AbstractText) {
      results.push({
        title: response.data.Heading || query,
        snippet: response.data.AbstractText,
        url: response.data.AbstractURL || "",
      });
    }

    if (response.data.RelatedTopics) {
      for (const topic of response.data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.substring(0, 100),
            snippet: topic.Text,
            url: topic.FirstURL,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";

export async function handleMessage(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const text = msg.text;

  if (!text) return;

  await addMessage(userId, "user", text);
  await bot.sendChatAction(chatId, "typing");

  try {
    const session = await getSession(userId);
    const provider = getProviderFromModel(session.currentModel);
    const history = await getHistory(userId);
    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await chatWithAI({
      messages,
      model: session.currentModel,
      provider,
    });

    await addMessage(userId, "assistant", response);

    const chunks = splitMessage(response, 4000);
    for (let i = 0; i < chunks.length; i++) {
      await bot.sendMessage(chatId, chunks[i]);
    }
  } catch (error: any) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
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

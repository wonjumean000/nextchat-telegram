import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { clearSession } from "../session";

export function handleClear(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  clearSession(msg.from!.id);
  bot.sendMessage(chatId, "Conversation history cleared.");
}

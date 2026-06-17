import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";

export function handleStart(bot: TelegramBot, msg: Message) {
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
      `Just send a message to chat with AI!`,
  );
}

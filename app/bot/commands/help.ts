import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";

export function handleHelp(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Command List:\n\n` +
      `/start - Welcome message\n` +
      `/help - This help message\n` +
      `/model [name] - View/change model\n` +
      `/clear - Clear conversation history\n` +
      `/search <query> - Search web and get AI summary\n` +
      `/translate <lang> <text> - Translate to target language\n` +
      `/lang - List supported languages\n\n` +
      `Send any text message to chat with AI!`,
  );
}

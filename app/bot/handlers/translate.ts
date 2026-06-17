import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";
import { SUPPORTED_LANGUAGES } from "../constants";

export function handleTranslate(
  bot: TelegramBot,
  msg: Message,
  args: string[],
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
          .join("\n"),
    );
    return;
  }

  const targetLang = args[0].toLowerCase();
  const text = args.slice(1).join(" ");

  if (!SUPPORTED_LANGUAGES[targetLang]) {
    bot.sendMessage(
      chatId,
      `Language "${targetLang}" not supported. Use /lang to see available languages.`,
    );
    return;
  }

  bot.sendChatAction(chatId, "typing");

  const session = getSession(userId);
  const langName = SUPPORTED_LANGUAGES[targetLang];

  const prompt = `Translate the following text to ${langName}. Only provide the translation, no explanations:\n\n"${text}"`;

  addMessage(userId, "user", prompt);

  const provider = getProviderFromModel(session.currentModel);
  const messages = getHistory(userId).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  chatWithAI({
    messages,
    model: session.currentModel,
    provider,
  })
    .then((response) => {
      addMessage(userId, "assistant", response);
      bot.sendMessage(chatId, `Translation (${langName}):\n\n${response}`);
    })
    .catch((error) => {
      bot.sendMessage(chatId, `Error: ${error.message}`);
    });
}

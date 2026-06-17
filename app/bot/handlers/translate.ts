import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";
import { SUPPORTED_LANGUAGES } from "../constants";

export async function handleTranslate(
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

  await bot.sendChatAction(chatId, "typing");

  try {
    const session = await getSession(userId);
    const langName = SUPPORTED_LANGUAGES[targetLang];

    const prompt = `Translate the following text to ${langName}. Only provide the translation, no explanations:\n\n"${text}"`;

    await addMessage(userId, "user", prompt);

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
    bot.sendMessage(chatId, `Translation (${langName}):\n\n${response}`);
  } catch (error: any) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
}

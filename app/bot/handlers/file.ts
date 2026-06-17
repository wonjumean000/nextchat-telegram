import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import axios from "axios";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";

export function handlePhoto(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  if (!msg.photo || msg.photo.length === 0) {
    bot.sendMessage(chatId, "No photo detected.");
    return;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "Analyzing image...");

  const caption = msg.caption || "What do you see in this image?";
  addMessage(userId, "user", `[Image] ${caption}`);

  const session = getSession(userId);
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
    .then((aiResponse) => {
      addMessage(userId, "assistant", aiResponse);
      bot.sendMessage(chatId, aiResponse);
    })
    .catch((error) => {
      bot.sendMessage(chatId, `Error processing image: ${error.message}`);
    });
}

export function handleDocument(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  if (!msg.document) {
    bot.sendMessage(chatId, "No document detected.");
    return;
  }

  const supportedTypes = ["text/plain"];
  if (!supportedTypes.includes(msg.document.mime_type || "")) {
    bot.sendMessage(
      chatId,
      "Unsupported file type. Please send text files (.txt).",
    );
    return;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "Processing document...");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  bot
    .getFile(msg.document.file_id)
    .then((file) => {
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      return axios.get(fileUrl, { responseType: "text" });
    })
    .then((response) => {
      const prompt = `Analyze this document:\n\n${response.data}`;
      addMessage(userId, "user", prompt);

      const session = getSession(userId);
      const provider = getProviderFromModel(session.currentModel);
      const messages = getHistory(userId).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      return chatWithAI({
        messages,
        model: session.currentModel,
        provider,
      });
    })
    .then((aiResponse) => {
      if (aiResponse) {
        addMessage(userId, "assistant", aiResponse);
        bot.sendMessage(chatId, aiResponse);
      }
    })
    .catch((error) => {
      bot.sendMessage(chatId, `Error processing document: ${error.message}`);
    });
}

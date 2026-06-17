import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import axios from "axios";
import { getSession, addMessage, getHistory } from "../session";
import { chatWithAI, getProviderFromModel } from "../api";

export async function handlePhoto(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  if (!msg.photo || msg.photo.length === 0) {
    bot.sendMessage(chatId, "No photo detected.");
    return;
  }

  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "Analyzing image...");

  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(response.data).toString("base64");

    const session = getSession(userId);
    const caption = msg.caption || "What do you see in this image?";

    addMessage(userId, "user", `[Image] ${caption}`);

    const provider = getProviderFromModel(session.currentModel);
    const messages = getHistory(userId).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const aiResponse = await chatWithAI({
      messages,
      model: session.currentModel,
      provider,
    });

    addMessage(userId, "assistant", aiResponse);
    bot.sendMessage(chatId, aiResponse);
  } catch (error: any) {
    bot.sendMessage(chatId, `Error processing image: ${error.message}`);
  }
}

export async function handleDocument(bot: TelegramBot, msg: Message) {
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

  await bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, "Processing document...");

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const file = await bot.getFile(msg.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "text" });

    const session = getSession(userId);
    const prompt = `Analyze this document:\n\n${response.data}`;

    addMessage(userId, "user", prompt);

    const provider = getProviderFromModel(session.currentModel);
    const messages = getHistory(userId).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const aiResponse = await chatWithAI({
      messages,
      model: session.currentModel,
      provider,
    });

    addMessage(userId, "assistant", aiResponse);
    bot.sendMessage(chatId, aiResponse);
  } catch (error: any) {
    bot.sendMessage(chatId, `Error processing document: ${error.message}`);
  }
}

import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { updateModel, getSession } from "../session";
import { fetchModels } from "../api";

export async function handleModel(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const args = msg.text?.split(" ").slice(1) || [];

  if (args.length === 0) {
    const session = getSession(msg.from!.id);
    const models = await fetchModels();

    const modelList = models.map((m) => `• ${m.id}`).join("\n");
    bot.sendMessage(
      chatId,
      `Current model: ${session.currentModel}\n\n` +
        `Available models:\n${modelList}\n\n` +
        `Use /model <name> to change`,
    );
    return;
  }

  const modelName = args[0].toLowerCase();
  const models = await fetchModels();
  const validModel = models.find((m) => m.id === modelName);

  if (!validModel) {
    bot.sendMessage(
      chatId,
      `Model "${modelName}" not found. Use /model to see available models.`,
    );
    return;
  }

  updateModel(msg.from!.id, modelName);
  bot.sendMessage(chatId, `Model changed to: ${modelName}`);
}

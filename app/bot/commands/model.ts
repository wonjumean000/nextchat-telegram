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

    // Group by provider
    const grouped: Record<string, string[]> = {};
    for (const m of models) {
      if (!grouped[m.provider]) grouped[m.provider] = [];
      grouped[m.provider].push(m.id);
    }

    let modelList = `Current model: ${session.currentModel}\n\n`;
    for (const [provider, providerModels] of Object.entries(grouped)) {
      modelList += `[${provider}]\n`;
      modelList += providerModels.map((id) => `  • ${id}`).join("\n");
      modelList += "\n\n";
    }
    modelList += `Use /model <name> to change`;

    bot.sendMessage(chatId, modelList);
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
  bot.sendMessage(
    chatId,
    `Model changed to: ${modelName} (${validModel.provider})`,
  );
}

import TelegramBot from "node-telegram-bot-api";
import { handleStart } from "../commands/start";
import { handleHelp } from "../commands/help";
import { handleModel } from "../commands/model";
import { handleClear } from "../commands/clear";
import { handleMessage } from "../handlers/message";
import { handleSearch } from "../handlers/search";
import { handleTranslate } from "../handlers/translate";
import { handlePhoto, handleDocument } from "../handlers/file";
import { SUPPORTED_LANGUAGES } from "../constants";

let bot: TelegramBot | null = null;

export function initBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  bot = new TelegramBot(token, { polling: false });

  bot.onText(/\/start/, (msg) => handleStart(bot!, msg));
  bot.onText(/\/help/, (msg) => handleHelp(bot!, msg));
  bot.onText(/\/model(.*)/, (msg) => handleModel(bot!, msg));
  bot.onText(/\/clear/, (msg) => handleClear(bot!, msg));
  bot.onText(/\/search(.*)/, (msg, match) => {
    const query = match?.[1]?.trim() || "";
    handleSearch(bot!, msg, query);
  });
  bot.onText(/\/translate(.*)/, (msg, match) => {
    const args = match?.[1]?.trim().split(" ") || [];
    handleTranslate(bot!, msg, args);
  });
  bot.onText(/\/lang/, (msg) => {
    const langList = Object.entries(SUPPORTED_LANGUAGES)
      .map(([code, name]) => `${code} - ${name}`)
      .join("\n");
    bot!.sendMessage(msg.chat.id, `Supported languages:\n\n${langList}`);
  });

  bot.on("photo", (msg) => handlePhoto(bot!, msg));
  bot.on("document", (msg) => handleDocument(bot!, msg));

  bot.on("message", (msg) => {
    if (msg.text?.startsWith("/")) return;
    if (msg.photo) return;
    if (msg.document) return;
    handleMessage(bot!, msg);
  });

  console.log("[Bot] Telegram bot initialized");
  return bot;
}

export function getBot(): TelegramBot | null {
  return bot;
}

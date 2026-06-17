import { NextRequest, NextResponse } from "next/server";
import { initBot, getBot } from "../../../../bot/telegram";
import { cleanupSessions } from "../../../../bot/session";

let botInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize bot on first request
    if (!botInitialized) {
      initBot();
      botInitialized = true;
    }

    // Cleanup old sessions periodically
    cleanupSessions();

    const bot = getBot();
    if (!bot) {
      return NextResponse.json(
        { error: "Bot not initialized" },
        { status: 500 },
      );
    }

    const body = await request.json();

    // Verify request is from Telegram
    if (!body.update_id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    bot.processUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", bot: !!getBot() });
}

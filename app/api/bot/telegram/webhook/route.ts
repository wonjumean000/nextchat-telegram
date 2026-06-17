import { NextRequest, NextResponse } from "next/server";
import { initBot, getBot } from "../../../../bot/telegram";

let botInitialized = false;

export async function POST(request: NextRequest) {
  try {
    if (!botInitialized) {
      initBot();
      botInitialized = true;
    }

    const bot = getBot();
    if (!bot) {
      return NextResponse.json(
        { error: "Bot not initialized" },
        { status: 500 },
      );
    }

    const body = await request.json();
    bot.processUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

import { NextResponse } from "next/server";
import { fetchModels } from "../../../../bot/api";

export async function GET() {
  try {
    const models = await fetchModels();
    return NextResponse.json({ models });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

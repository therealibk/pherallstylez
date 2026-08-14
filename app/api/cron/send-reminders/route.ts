import { NextResponse } from "next/server";
import { checkAndSendReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/send-reminders] CRON_SECRET is not configured — refusing to run without authentication");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const result = await checkAndSendReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/send-reminders] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const settings = await db.businessSettings.findFirst({
    select: { appearanceData: true },
  });

  const appearance = settings?.appearanceData as { faviconUrl?: string } | null;
  const dataUrl = appearance?.faviconUrl?.trim();

  if (!dataUrl?.startsWith("data:image/")) {
    return new NextResponse(null, { status: 404 });
  }

  // Parse "data:<mime>;base64,<data>"
  const [header, base64] = dataUrl.split(",");
  const mime = header.replace("data:", "").replace(";base64", "");
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

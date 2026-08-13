import { type NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { allowed } = checkRateLimit(`login:${ip}`);

  if (!allowed) {
    return Response.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  // handlers.POST accepts only the request — context is handled internally by Auth.js
  return handlers.POST(request);
}

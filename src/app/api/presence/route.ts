import { NextRequest, NextResponse } from "next/server";
import { getPresenceCount, touchPresence } from "@/lib/presence";

function isValidVisitorId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}

export async function GET() {
  return NextResponse.json({ viewers: getPresenceCount() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isValidVisitorId(body.visitorId)) {
      return NextResponse.json({ error: "Invalid visitorId" }, { status: 400 });
    }

    const viewers = touchPresence(body.visitorId);
    return NextResponse.json({ viewers });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

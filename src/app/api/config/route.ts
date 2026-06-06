import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const lineConfigured = !!(
    process.env.LINE_CHANNEL_ACCESS_TOKEN &&
    process.env.LINE_CHANNEL_SECRET
  );

  return NextResponse.json({
    lineConfigured,
    bypassSignature: process.env.BYPASS_LINE_SIGNATURE === "true",
  });
}

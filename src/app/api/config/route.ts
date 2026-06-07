import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const lineConfigured = !!(
    process.env.LINE_CHANNEL_ACCESS_TOKEN &&
    process.env.LINE_CHANNEL_SECRET
  );

  let dbStatus = "unknown";
  let vehicleCount = 0;
  let errorMsg = "";

  try {
    const vehicles = await db.vehicle.findMany({ select: { id: true } });
    dbStatus = "connected";
    vehicleCount = vehicles.length;
  } catch (err: any) {
    dbStatus = "error";
    errorMsg = err.message;
  }

  return NextResponse.json({
    lineConfigured,
    bypassSignature: process.env.BYPASS_LINE_SIGNATURE === "true",
    dbStatus,
    vehicleCount,
    errorMsg,
  });
}

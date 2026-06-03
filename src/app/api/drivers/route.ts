import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const drivers = await db.user.findMany({
      where: { role: "DRIVER" },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Failed to fetch drivers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 550 }
    );
  }
}

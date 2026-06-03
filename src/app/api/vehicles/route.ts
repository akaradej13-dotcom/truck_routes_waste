import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const vehicles = await db.vehicle.findMany({
      include: {
        driver: true,
      },
    });
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Failed to fetch vehicles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

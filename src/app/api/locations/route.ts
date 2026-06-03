import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const locations = await db.location.findMany();
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { driverId, lineUserId } = await request.json();

    if (!driverId || !lineUserId) {
      return NextResponse.json(
        { error: "กรุณาระบุ driverId และ lineUserId" },
        { status: 400 }
      );
    }

    // 1. Check if this lineUserId is already linked to another driver.
    // If so, clear it first to avoid duplicate lineUserId database constraint.
    await db.user.updateMany({
      where: { lineUserId },
      data: { lineUserId: null },
    });

    // 2. Link this lineUserId to the target driver
    const updatedDriver = await db.user.update({
      where: { id: driverId },
      data: { lineUserId },
    });

    return NextResponse.json({ success: true, driver: updatedDriver });
  } catch (error: any) {
    console.error("Failed to bind driver:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการผูกบัญชีคนขับ: " + error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routePointId, status, actualWeightKg, failureReason, notes } = body;

    if (!routePointId || !status) {
      return NextResponse.json(
        { error: "กรุณาระบุ routePointId และ status" },
        { status: 400 }
      );
    }

    const validStatuses = ["PENDING", "COLLECTED", "SKIPPED", "ISSUE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "สถานะการเก็บขยะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 1. Update the RoutePoint
    const updatedPoint = await db.routePoint.update({
      where: { id: routePointId },
      data: {
        status,
        actualWeightKg: status === "COLLECTED" ? (actualWeightKg !== undefined ? parseFloat(actualWeightKg) : null) : null,
        failureReason: status === "ISSUE" || status === "SKIPPED" ? failureReason : null,
        notes: notes || null,
        collectedAt: status === "COLLECTED" ? new Date() : null,
      },
    });

    // 2. Recalculate Route total weight (sum of actual weights for collected, fall back to expected if actual is missing)
    const routePoints = await db.routePoint.findMany({
      where: { routeId: updatedPoint.routeId },
    });

    const totalWeight = routePoints.reduce((sum, pt) => {
      if (pt.status === "COLLECTED") {
        return sum + (pt.actualWeightKg !== null ? pt.actualWeightKg : pt.expectedWeightKg);
      }
      return sum;
    }, 0);

    await db.route.update({
      where: { id: updatedPoint.routeId },
      data: {
        totalWeightKg: totalWeight,
        status: routePoints.every(pt => pt.status === "COLLECTED" || pt.status === "SKIPPED" || pt.status === "ISSUE")
          ? "COMPLETED" 
          : "IN_PROGRESS"
      },
    });

    return NextResponse.json({
      success: true,
      updatedPoint,
      message: "อัปเดตสถานะงานเก็บขยะสำเร็จเรียบร้อย",
    });
  } catch (error) {
    console.error("Failed to update route point:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลผลงานคิวรถ" },
      { status: 500 }
    );
  }
}

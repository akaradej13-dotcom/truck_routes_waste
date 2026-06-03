import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get("lineUserId");
    const driverId = searchParams.get("driverId");

    if (!lineUserId && !driverId) {
      return NextResponse.json(
        { error: "กรุณาระบุ lineUserId หรือ driverId ในพารามิเตอร์" },
        { status: 400 }
      );
    }

    // 1. Find the driver
    let driver = null;
    if (lineUserId) {
      driver = await db.user.findFirst({
        where: { lineUserId, role: "DRIVER" },
      });
    } else if (driverId) {
      driver = await db.user.findUnique({
        where: { id: driverId, role: "DRIVER" },
      });
    }

    if (!driver) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีคนขับรถในระบบ หรือไม่มีสิทธิ์เข้าถึง" },
        { status: 404 }
      );
    }

    // 2. Find the assigned vehicle
    const vehicle = await db.vehicle.findFirst({
      where: { driverId: driver.id, status: "ACTIVE" },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "ไม่พบรถเก็บขยะที่พร้อมใช้งานสำหรับคนขับท่านนี้" },
        { status: 404 }
      );
    }

    // 3. Find today's route
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const route = await db.route.findFirst({
      where: {
        vehicleId: vehicle.id,
        date: today,
      },
      include: {
        routePoints: {
          orderBy: { sequenceOrder: "asc" },
          include: {
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      driver,
      vehicle,
      route: route || null,
    });
  } catch (error) {
    console.error("Failed to fetch driver route:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลเส้นทางวิ่งของคนขับ" },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';

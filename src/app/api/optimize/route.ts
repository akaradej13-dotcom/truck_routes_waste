import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { solveCVRP, Point, Vehicle } from "@/lib/vrp";

const DEPOT = { latitude: 13.7563, longitude: 100.5018 }; // Bangkok Center

export async function POST() {
  try {
    // 1. Fetch locations and active vehicles
    const locations = await db.location.findMany();
    const vehicles = await db.vehicle.findMany({
      where: { status: "ACTIVE" },
      include: { driver: true }
    });

    if (locations.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบตำแหน่งจุดเก็บขยะในระบบ กรุณาอัปโหลดไฟล์ Excel ก่อน" },
        { status: 400 }
      );
    }

    if (vehicles.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบรถเก็บขยะที่พร้อมใช้งาน (ACTIVE) ในระบบ" },
        { status: 400 }
      );
    }

    // 2. Build coordinates for OSRM table query: lon,lat;lon,lat;...
    // Index 0: Depot
    // Index 1..N: Locations
    const coordsArray = [
      `${DEPOT.longitude},${DEPOT.latitude}`,
      ...locations.map((loc) => `${loc.longitude},${loc.latitude}`),
    ];
    const coordsQuery = coordsArray.join(";");

    console.log("Fetching distance matrix from OSRM for", coordsArray.length, "points...");
    
    // Call public OSRM table service (100% free, no API key needed)
    const osrmUrl = `http://router.project-osrm.org/table/v1/driving/${coordsQuery}?annotations=distance,duration`;
    
    const response = await fetch(osrmUrl, {
      headers: { "User-Agent": "RecycleRouteOptimizer/1.0" },
    });

    if (!response.ok) {
      throw new Error(`OSRM service error: ${response.statusText}`);
    }

    const osrmData = await response.json();
    const distanceMatrix: number[][] = osrmData.distances;
    const durationMatrix: number[][] = osrmData.durations;

    if (!distanceMatrix || !durationMatrix) {
      throw new Error("Invalid matrix response from OSRM");
    }

    // 3. Format inputs for solver
    const solverPoints: Point[] = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      expectedWeightKg: loc.expectedWeightKg,
    }));

    const solverVehicles: Vehicle[] = vehicles.map((v) => ({
      id: v.id,
      name: `${v.name} (${v.plateNumber})`,
      capacityKg: v.capacityKg,
    }));

    // 4. Run Clarke-Wright Savings optimization
    const optimizedRoutes = solveCVRP(
      DEPOT,
      solverPoints,
      solverVehicles,
      distanceMatrix,
      durationMatrix
    );

    // 5. Save the routes in SQLite inside a transaction
    // Clean up old routes first to prevent daily route accumulation
    await db.$transaction(async (tx) => {
      // Clear all existing routes and their route points
      await tx.routePoint.deleteMany();
      await tx.route.deleteMany();

      const today = new Date();
      // Set to midnight local time for date query consistency
      today.setHours(0, 0, 0, 0);

      for (const optRoute of optimizedRoutes) {
        // Create Route
        const dbRoute = await tx.route.create({
          data: {
            vehicleId: optRoute.vehicleId,
            date: today,
            status: "PENDING",
            totalWeightKg: optRoute.totalWeightKg,
            distanceMeters: optRoute.distanceMeters,
            durationSeconds: optRoute.durationSeconds,
          },
        });

        // Create RoutePoints in sequence
        const routePointsData = optRoute.points.map((pt, index) => ({
          routeId: dbRoute.id,
          locationId: pt.id,
          sequenceOrder: index + 1,
          expectedWeightKg: pt.expectedWeightKg,
          status: "PENDING" as const,
        }));

        await tx.routePoint.createMany({
          data: routePointsData,
        });
      }
    });

    return NextResponse.json({
      success: true,
      routesCount: optimizedRoutes.length,
      routes: optimizedRoutes,
      message: `คำนวณและจัดสรรเส้นทางวิ่งให้รถเก็บขยะจำนวน ${optimizedRoutes.length} คันเสร็จสมบูรณ์`,
    });
  } catch (error: any) {
    console.error("Route optimization failed:", error);
    return NextResponse.json(
      { error: `การวางแผนเส้นทางล้มเหลว: ${error.message || error}` },
      { status: 500 }
    );
  }
}

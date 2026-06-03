import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const dbRoutes = await db.route.findMany({
      include: {
        vehicle: {
          include: {
            driver: true,
          },
        },
        routePoints: {
          orderBy: { sequenceOrder: "asc" },
          include: {
            location: true,
          },
        },
      },
    });

    // Format to match the frontend RouteData structure
    const formattedRoutes = dbRoutes.map((r) => ({
      vehicleId: r.vehicleId,
      vehicleName: `${r.vehicle.name} (${r.vehicle.plateNumber})`,
      points: r.routePoints.map((rp) => ({
        id: rp.location.id,
        name: rp.location.name,
        address: rp.location.address,
        latitude: rp.location.latitude,
        longitude: rp.location.longitude,
        expectedWeightKg: rp.expectedWeightKg,
        contactPhone: rp.location.contactPhone,
      })),
      totalWeightKg: r.totalWeightKg,
      distanceMeters: r.distanceMeters,
      durationSeconds: r.durationSeconds,
    }));

    return NextResponse.json(formattedRoutes);
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

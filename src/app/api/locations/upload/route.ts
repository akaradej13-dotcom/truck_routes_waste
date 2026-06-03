import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "กรุณาอัปโหลดไฟล์ Excel หรือ CSV" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet data to JSON array
    const rawRows = XLSX.utils.sheet_to_json(sheet) as any[];

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลในไฟล์ที่อัปโหลด" },
        { status: 400 }
      );
    }

    const newLocations = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      
      // Case-insensitive / alias resolution for columns
      const name = row.Name || row.name || row["ชื่อจุดเก็บ"] || "";
      const address = row.Address || row.address || row["ที่อยู่"] || "";
      const latRaw = row.Latitude || row.latitude || row.Lat || row.lat || row["ละติจูด"];
      const lngRaw = row.Longitude || row.longitude || row.Lng || row.lng || row["ลองจิจูด"];
      const contactPhone = row.ContactPhone || row.contactPhone || row["เบอร์ติดต่อ"] || null;
      
      if (!name) {
        return NextResponse.json(
          { error: `แถวที่ ${i + 2}: ไม่พบข้อมูลชื่อจุดเก็บ (Name)` },
          { status: 400 }
        );
      }

      const latitude = parseFloat(latRaw);
      const longitude = parseFloat(lngRaw);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: `แถวที่ ${i + 2}: พิกัด ละติจูด/ลองจิจูด ไม่ถูกต้อง` },
          { status: 400 }
        );
      }

      const weightRaw = row.ExpectedWeightKg || row.expectedWeightKg || row.Weight || row.weight || row["น้ำหนักคาดการณ์"] || 100;
      const expectedWeightKg = parseFloat(weightRaw);

      newLocations.push({
        name: String(name),
        address: String(address),
        latitude,
        longitude,
        contactPhone: contactPhone ? String(contactPhone) : null,
        expectedWeightKg: isNaN(expectedWeightKg) ? 100 : expectedWeightKg,
      });
    }

    // Insert new locations into the database (clearing the old ones or appending,
    // let's clear the old ones to keep it simple for the dispatchers,
    // or keep them. Let's do clear-and-insert for a clean daily schedule slate)
    await db.routePoint.deleteMany();
    await db.location.deleteMany();

    // Batch insert using createMany
    // Note: SQLite supports createMany in Prisma 5+
    await db.location.createMany({
      data: newLocations,
    });

    return NextResponse.json({
      success: true,
      count: newLocations.length,
      message: `อิมพอร์ตข้อมูลเรียบร้อยแล้วจำนวน ${newLocations.length} จุด`,
    });
  } catch (error) {
    console.error("Failed to parse and upload spreadsheet:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผลไฟล์ กรุณาตรวจสอบรูปแบบตารางข้อมูล" },
      { status: 500 }
    );
  }
}

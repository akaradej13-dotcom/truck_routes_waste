

import { db as prisma } from "../src/lib/db";

const sampleLocations = [
  {
    name: "สยามพารากอน (Siam Paragon)",
    address: "991 ถ. พระรามที่ ๑ ปทุมวัน กรุงเทพมหานคร",
    latitude: 13.7461,
    longitude: 100.5342,
    contactPhone: "02-610-8000"
  },
  {
    name: "วัดพระแก้ว (Grand Palace)",
    address: "ถ. หน้าพระลาน พระบรมมหาราชวัง พระนคร กรุงเทพมหานคร",
    latitude: 13.7516,
    longitude: 100.4927,
    contactPhone: "02-623-5500"
  },
  {
    name: "ตลาดนัดจตุจักร (Chatuchak Market)",
    address: "ถ. กำแพงเพชร 2 จตุจักร กรุงเทพมหานคร",
    latitude: 13.8000,
    longitude: 100.5500,
    contactPhone: "02-272-4440"
  },
  {
    name: "สวนลุมพินี (Lumpini Park)",
    address: "ถ. พระรามที่ ๔ ลุมพินี ปทุมวัน กรุงเทพมหานคร",
    latitude: 13.7314,
    longitude: 100.5414,
    contactPhone: "02-252-7035"
  },
  {
    name: "เซ็นทรัล อีสต์วิลล์ (Central Eastville)",
    address: "69/3 ถ. ประดิษฐ์มนูธรรม ลาดพร้าว กรุงเทพมหานคร",
    latitude: 13.8035,
    longitude: 100.6145,
    contactPhone: "02-102-5000"
  },
  {
    name: "เทอร์มินอล 21 อโศก (Terminal 21)",
    address: "88 ซ. สุขุมวิท 19 คลองเตยเหนือ วัฒนา กรุงเทพมหานคร",
    latitude: 13.7369,
    longitude: 100.5604,
    contactPhone: "02-108-0888"
  },
  {
    name: "อนุสาวรีย์ชัยสมรภูมิ (Victory Monument)",
    address: "ถ. ราชวิถี ถนนพญาไท ราชเทวี กรุงเทพมหานคร",
    latitude: 13.7649,
    longitude: 100.5383,
    contactPhone: "02-246-0199"
  },
  {
    name: "ไอคอนสยาม (IconSiam)",
    address: "299 ถ. เจริญนคร คลองต้นไทร คลองสาน กรุงเทพมหานคร",
    latitude: 13.7266,
    longitude: 100.5108,
    contactPhone: "02-495-7000"
  },
  {
    name: "เซ็นทรัล พระราม 9 (Central Rama 9)",
    address: "9/9 ถ. รัชดาภิเษก ห้วยขวาง กรุงเทพมหานคร",
    latitude: 13.7578,
    longitude: 100.5661,
    contactPhone: "02-103-5999"
  },
  {
    name: "ตลาดห้วยขวาง (Huai Khwang Market)",
    address: "ถ. ประชาสงเคราะห์ ดินแดง กรุงเทพมหานคร",
    latitude: 13.7788,
    longitude: 100.5739,
    contactPhone: "02-277-2640"
  }
];

async function main() {
  console.log("ล้างข้อมูลเก่า...");
  await prisma.routePoint.deleteMany();
  await prisma.location.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  
  console.log("กำลังเพิ่มข้อมูลผู้ใช้...");
  const driver1 = await prisma.user.create({
    data: {
      name: "สมชาย ยอดนักขับ (Somchai)",
      role: "DRIVER",
      username: "driver_somchai"
    }
  });

  const driver2 = await prisma.user.create({
    data: {
      name: "สมบัติ วิ่งสู้ฟัด (Sombat)",
      role: "DRIVER",
      username: "driver_sombat"
    }
  });

  const driver3 = await prisma.user.create({
    data: {
      name: "สมควร สวนป่า (Somkhuan)",
      role: "DRIVER",
      username: "driver_somkhuan"
    }
  });

  console.log("กำลังเพิ่มข้อมูลยานพาหนะ...");
  await prisma.vehicle.create({
    data: {
      name: "รถบรรทุก 4 ล้อเล็ก",
      plateNumber: "3กข-1234",
      capacityKg: 500.0,
      driverId: driver1.id,
      status: "ACTIVE"
    }
  });

  await prisma.vehicle.create({
    data: {
      name: "รถบรรทุก 6 ล้อใหญ่",
      plateNumber: "5กง-5678",
      capacityKg: 800.0,
      driverId: driver2.id,
      status: "ACTIVE"
    }
  });

  await prisma.vehicle.create({
    data: {
      name: "รถกระบะขยะฝาปิด",
      plateNumber: "1กจ-9012",
      capacityKg: 350.0,
      driverId: driver3.id,
      status: "MAINTENANCE"
    }
  });

  console.log("กำลังเพิ่มข้อมูลจุดเก็บขยะตัวอย่าง 10 จุด...");
  for (const loc of sampleLocations) {
    await prisma.location.create({
      data: loc
    });
  }
  
  console.log("เสร็จสิ้นการเพิ่มข้อมูลตัวอย่างครบถ้วน!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Note: in Prisma 7 there might be no connection close required or handled by driver
  });

import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const sampleData = [
  {
    Name: "สยามพารากอน (Siam Paragon)",
    Address: "991 ถ. พระรามที่ ๑ ปทุมวัน กรุงเทพมหานคร",
    Latitude: 13.7461,
    Longitude: 100.5342,
    ExpectedWeightKg: 150,
    ContactPhone: "02-610-8000"
  },
  {
    Name: "วัดพระแก้ว (Grand Palace)",
    Address: "ถ. หน้าพระลาน พระบรมมหาราชวัง พระนคร กรุงเทพมหานคร",
    Latitude: 13.7516,
    Longitude: 100.4927,
    ExpectedWeightKg: 100,
    ContactPhone: "02-623-5500"
  },
  {
    Name: "ตลาดนัดจตุจักร (Chatuchak Market)",
    Address: "ถ. กำแพงเพชร 2 จตุจักร กรุงเทพมหานคร",
    Latitude: 13.8000,
    Longitude: 100.5500,
    ExpectedWeightKg: 250,
    ContactPhone: "02-272-4440"
  },
  {
    Name: "สวนลุมพินี (Lumpini Park)",
    Address: "ถ. พระรามที่ ๔ ลุมพินี ปทุมวัน กรุงเทพมหานคร",
    Latitude: 13.7314,
    Longitude: 100.5414,
    ExpectedWeightKg: 90,
    ContactPhone: "02-252-7035"
  },
  {
    Name: "เซ็นทรัล อีสต์วิลล์ (Central Eastville)",
    Address: "69/3 ถ. ประดิษฐ์มนูธรรม ลาดพร้าว กรุงเทพมหานคร",
    Latitude: 13.8035,
    Longitude: 100.6145,
    ExpectedWeightKg: 200,
    ContactPhone: "02-102-5000"
  },
  {
    Name: "เทอร์มินอล 21 อโศก (Terminal 21)",
    Address: "88 ซ. สุขุมวิท 19 คลองเตยเหนือ วัฒนา กรุงเทพมหานคร",
    Latitude: 13.7369,
    Longitude: 100.5604,
    ExpectedWeightKg: 130,
    ContactPhone: "02-108-0888"
  },
  {
    Name: "อนุสาวรีย์ชัยสมรภูมิ (Victory Monument)",
    Address: "ถ. ราชวิถี ถนนพญาไท ราชเทวี กรุงเทพมหานคร",
    Latitude: 13.7649,
    Longitude: 100.5383,
    ExpectedWeightKg: 80,
    ContactPhone: "02-246-0199"
  },
  {
    Name: "ไอคอนสยาม (IconSiam)",
    Address: "299 ถ. เจริญนคร คลองต้นไทร คลองสาน กรุงเทพมหานคร",
    Latitude: 13.7266,
    Longitude: 100.5108,
    ExpectedWeightKg: 180,
    ContactPhone: "02-495-7000"
  },
  {
    Name: "เซ็นทรัล พระราม 9 (Central Rama 9)",
    Address: "9/9 ถ. รัชดาภิเษก ห้วยขวาง กรุงเทพมหานคร",
    Latitude: 13.7578,
    Longitude: 100.5661,
    ExpectedWeightKg: 160,
    ContactPhone: "02-103-5999"
  },
  {
    Name: "ตลาดห้วยขวาง (Huai Khwang Market)",
    Address: "ถ. ประชาสงเคราะห์ ดินแดง กรุงเทพมหานคร",
    Latitude: 13.7788,
    Longitude: 100.5739,
    ExpectedWeightKg: 220,
    ContactPhone: "02-277-2640"
  }
];

function main() {
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filename = path.join(publicDir, "sample_locations.xlsx");
  console.log("กำลังสร้างไฟล์ Excel ใน:", filename);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, "Locations");
  XLSX.writeFile(wb, filename);

  console.log("สร้างไฟล์ Excel เรียบร้อยแล้ว!");
}

main();

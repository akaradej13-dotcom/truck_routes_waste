const { parseDate, parseWeight, parseLocationAndItem, parseThaiPickupMessage } = require("../src/lib/lineParser");

const mockLocations = [
  { id: "1", name: "สยามพารากอน (Siam Paragon)" },
  { id: "2", name: "วัดพระแก้ว (Grand Palace)" },
  { id: "3", name: "เซ็นทรัล อีสต์วิลล์ (Central Eastville)" }
];

const testMessage = "วันที่ 12 มิ.ย. รับขยะพลาสติกที่สยามพารากอน 150 กก.";

console.log("--- Diagnosing lineParser ---");
console.log(`Input: "${testMessage}"`);

const date = parseDate(testMessage);
console.log("parseDate result:", date);

const weight = parseWeight(testMessage);
console.log("parseWeight result:", weight);

const locAndItem = parseLocationAndItem(testMessage, mockLocations);
console.log("parseLocationAndItem result:", locAndItem);

const fullResult = parseThaiPickupMessage(testMessage, mockLocations);
console.log("parseThaiPickupMessage result:", fullResult);

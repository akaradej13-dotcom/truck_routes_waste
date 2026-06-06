export interface ParsedMessage {
  date: Date;
  item: string;
  locationName: string;
  weightKg?: number;
}

const THAI_MONTHS: { [key: string]: number } = {
  "ม.ค.": 0, "มกราคม": 0,
  "ก.พ.": 1, "กุมภาพันธ์": 1,
  "มี.ค.": 2, "มีนาคม": 2,
  "เม.ย.": 3, "เมษายน": 3,
  "พ.ค.": 4, "พฤษภาคม": 4,
  "มิ.ย.": 5, "มิถุนายน": 5,
  "ก.ค.": 6, "กรกฎาคม": 6,
  "ส.ค.": 7, "สิงหาคม": 7,
  "ก.ย.": 8, "กันยายน": 8,
  "ต.ค.": 9, "ตุลาคม": 9,
  "พ.ย.": 10, "พฤศจิกายน": 10,
  "ธ.ค.": 11, "ธันวาคม": 11
};

/**
 * Extracts a Date from Thai/numeric natural language strings.
 * Supports:
 * - "วันนี้", "พรุ่งนี้"
 * - "12 มิ.ย.", "15 มิถุนายน 2569", "วันที่ 9 กรกฎาคม"
 * - "12/06", "12-06-2026"
 */
export function parseDate(text: string): Date | null {
  const now = new Date();
  
  if (text.includes("วันนี้")) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  if (text.includes("พรุ่งนี้")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  let day: number | null = null;
  let month: number | null = null; // 0-indexed
  let year: number = now.getFullYear();

  // Pattern 1: Thai Month names (e.g. 12 มิ.ย. 2569, วันที่ 5 ตุลาคม)
  const monthsRegex = Object.keys(THAI_MONTHS).join("|").replace(/\./g, "\\.");
  const thaiPattern = new RegExp(`(?:วันที่)?\\s*(\\d{1,2})\\s*(${monthsRegex})\\s*(?:พ\\.ศ\\.|ค\\.ศ\\.)?\\s*(\\d{2,4})?`, "i");
  const thaiMatch = text.match(thaiPattern);

  if (thaiMatch) {
    day = parseInt(thaiMatch[1], 10);
    const monthStr = thaiMatch[2];
    month = THAI_MONTHS[monthStr];
    
    if (thaiMatch[3]) {
      let parsedYear = parseInt(thaiMatch[3], 10);
      if (parsedYear > 2500) {
        year = parsedYear - 543; // Buddhist Era to Gregorian
      } else if (parsedYear < 100) {
        year = parsedYear + 2000;
      } else {
        year = parsedYear;
      }
    }
  } else {
    // Pattern 2: Numeric patterns (e.g. 12/06/2026, 12-06)
    const numericMatch = text.match(/(?:วันที่)?\s*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (numericMatch) {
      day = parseInt(numericMatch[1], 10);
      month = parseInt(numericMatch[2], 10) - 1; // 1-12 to 0-11
      
      if (numericMatch[3]) {
        let parsedYear = parseInt(numericMatch[3], 10);
        if (parsedYear > 2500) {
          year = parsedYear - 543;
        } else if (parsedYear < 100) {
          year = parsedYear + 2000;
        } else {
          year = parsedYear;
        }
      }
    }
  }

  if (day !== null && month !== null && !isNaN(day) && !isNaN(month)) {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

/**
 * Extracts the weight from the message text (e.g., "150 กก.", "200 kg").
 */
export function parseWeight(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:กก\.|กก|กิโลกรัม|กิโล|kg|kilograms)/i);
  if (match) {
    const weight = parseFloat(match[1]);
    if (!isNaN(weight)) {
      return weight;
    }
  }
  return undefined;
}

/**
 * Clean location names by removing parentheses and English translations for better matching
 */
function cleanLocationNameForMatch(name: string): string {
  // E.g., "สยามพารากอน (Siam Paragon)" -> "สยามพารากอน"
  return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

/**
 * Parses the location and item from the text.
 * Uses a hybrid approach:
 * 1. Checks if any database location name matches a substring of the text.
 * 2. If yes, that's our location. The rest of the message is cleaned to find the item.
 * 3. If no match is found, splits on "ที่" or "ณ" to identify location and item.
 */
export function parseLocationAndItem(
  text: string,
  dbLocations: { name: string; id: string }[]
): { locationName: string; matchedLocationId?: string; item: string } {
  
  let matchedName = "";
  let matchedId: string | undefined = undefined;

  // 1. Search for existing database locations in the text
  for (const loc of dbLocations) {
    const cleanedDbName = cleanLocationNameForMatch(loc.name);
    // Extract English name in parens if exists, e.g. "Siam Paragon"
    const engMatch = loc.name.match(/\((.*?)\)/);
    const engName = engMatch ? engMatch[1].trim() : "";

    // Check if text contains the Thai name or the English name
    if (
      (cleanedDbName.length > 2 && text.toLowerCase().includes(cleanedDbName.toLowerCase())) ||
      (engName.length > 2 && text.toLowerCase().includes(engName.toLowerCase()))
    ) {
      // Keep the longest match to be more specific
      if (cleanedDbName.length > matchedName.length) {
        matchedName = loc.name; // Use the full name including parens
        matchedId = loc.id;
      }
    }
  }

  if (matchedName) {
    // Location is matched from DB. Now clean the text to extract the item
    // Remove matched location name and any English name
    let itemText = text;
    const cleanedDbName = cleanLocationNameForMatch(matchedName);
    const engMatch = matchedName.match(/\((.*?)\)/);
    const engName = engMatch ? engMatch[1].trim() : "";

    itemText = itemText.replace(new RegExp(cleanedDbName, "gi"), "");
    if (engName) {
      itemText = itemText.replace(new RegExp(engName, "gi"), "");
    }

    // Remove dates, weight details, and common Thai prepositions/verbs
    itemText = cleanMetadataFromText(itemText);

    return {
      locationName: matchedName,
      matchedLocationId: matchedId,
      item: itemText || "ขยะทั่วไป"
    };
  }

  // 2. Fallback: Split on "ที่" or "ณ"
  const splitMatch = text.match(/(.*?)\s*(?:ที่|ณ)\s*([^ที่ณ]+)$/);
  if (splitMatch) {
    const preText = splitMatch[1];
    const postText = splitMatch[2];

    const locationName = postText.replace(/[\(\)\{\}\[\]\-\+\=\_\*\&]/g, "").trim();
    const item = cleanMetadataFromText(preText) || "ขยะทั่วไป";

    return {
      locationName: locationName || "ไม่ทราบสถานที่",
      item
    };
  }

  // Last fallback: If we can't find a location split, assume location is Bangkok Center/Depot,
  // and everything else is the item
  return {
    locationName: "ศูนย์คัดแยกขยะ (Depot)",
    item: cleanMetadataFromText(text) || "ขยะทั่วไป"
  };
}

/**
 * Clean up text by removing dates, weights, and command words ("รับ", "เก็บ", "เอา")
 */
function cleanMetadataFromText(text: string): string {
  let cleaned = text;

  // Remove Date-like words (Thai month names and digits)
  const monthsRegex = Object.keys(THAI_MONTHS).join("|").replace(/\./g, "\\.");
  cleaned = cleaned.replace(new RegExp(`(?:วันที่)?\\s*\\d{1,2}\\s*(?:${monthsRegex})\\s*(?:พ\\.ศ\\.|ค\\.ศ\\.)?\\s*\\d{0,4}`, "gi"), "");
  cleaned = cleaned.replace(/(?:วันที่)?\\s*\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/g, "");
  cleaned = cleaned.replace(/วันนี้|พรุ่งนี้/g, "");

  // Remove Weight-like words
  cleaned = cleaned.replace(/\d+(?:\.\d+)?\s*(?:กก\.|กก|กิโลกรัม|กิโล|kg|kilograms)/gi, "");

  // Remove action verbs/prefixes
  cleaned = cleaned.replace(/^\s*(?:รับ|เก็บ|เอา|ส่ง|ขน|จัดการ|ไปรับ|ไปเก็บ)\s*/g, "");
  
  // Remove trailing "ที่" or "ณ"
  cleaned = cleaned.replace(/\s*(?:ที่|ณ)\s*$/g, "");

  // Remove extra whitespaces, commas, or specific particles
  cleaned = cleaned.replace(/[\s\t\n]+/g, " ");
  cleaned = cleaned.replace(/^[\s,，.。]+|[\s,，.。]+$/g, "");

  return cleaned.trim();
}

/**
 * Full Thai message parser helper
 */
export function parseThaiPickupMessage(
  text: string,
  dbLocations: { name: string; id: string }[]
): ParsedMessage | null {
  const date = parseDate(text);
  if (!date) return null;

  const { locationName, matchedLocationId, item } = parseLocationAndItem(text, dbLocations);
  const weightKg = parseWeight(text);

  return {
    date,
    item,
    locationName,
    weightKg
  };
}

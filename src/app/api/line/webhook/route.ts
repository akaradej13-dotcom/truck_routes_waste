import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseThaiPickupMessage } from "@/lib/lineParser";
import crypto from "crypto";

// For serverless/API execution consistency
export const dynamic = "force-dynamic";

/**
 * Verify LINE webhook signature using SHA256 HMAC
 */
function verifySignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * Send a reply message back to LINE
 */
async function sendLineReply(replyToken: string, messageObj: any, accessToken: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [messageObj],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`LINE Reply API failed (${res.status}):`, errorBody);
    throw new Error(`LINE Reply API failed: ${res.statusText}`);
  }
}

/**
 * Generate a premium LINE Flex Message card for daily schedules
 */
function generateFlexBubble(
  dateStr: string,
  result: { locationName: string; item: string; weight: number },
  routesOnDate: any[]
) {
  const pointsList: any[] = [];
  for (const r of routesOnDate) {
    for (const pt of r.routePoints) {
      pointsList.push({
        name: pt.location.name,
        item: pt.notes || "ขยะทั่วไป",
        weight: pt.expectedWeightKg,
        plate: r.vehicle.plateNumber,
        status: pt.status
      });
    }
  }

  const maxDisplay = 6;
  const displayedPoints = pointsList.slice(0, maxDisplay);
  const remainingCount = pointsList.length - maxDisplay;

  const pointContents = displayedPoints.map((pt, idx) => {
    const sequenceNum = String(idx + 1).padStart(2, "0");
    return {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      margin: idx === 0 ? "none" : "md",
      alignItems: "center",
      contents: [
        {
          type: "text",
          text: sequenceNum,
          size: "sm",
          weight: "bold",
          color: "#10B981",
          flex: 1
        },
        {
          type: "box",
          layout: "vertical",
          flex: 6,
          contents: [
            {
              type: "text",
              text: pt.name,
              size: "xs",
              weight: "bold",
              color: "#FFFFFF",
              maxLines: 1,
              ellipsize: true
            },
            {
              type: "text",
              text: `งาน: ${pt.item} • รถ: ${pt.plate}`,
              size: "xxs",
              color: "#71717A",
              margin: "xs"
            }
          ]
        },
        {
          type: "text",
          text: `${pt.weight} กก.`,
          size: "xs",
          weight: "bold",
          color: "#34D399",
          align: "end",
          flex: 3
        }
      ]
    };
  });

  if (remainingCount > 0) {
    pointContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: `... และอีก ${remainingCount} รายการรับขยะในวันเดียวกัน`,
          size: "xs",
          color: "#71717A",
          style: "italic"
        }
      ]
    } as any);
  }

  return {
    type: "flex",
    altText: "แผนเดินรถเก็บขยะรายวัน 🚚",
    contents: {
      type: "bubble",
      size: "giga",
      styles: {
        header: {
          backgroundColor: "#064E3B"
        },
        body: {
          backgroundColor: "#09090B"
        }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "แผนเดินรถเก็บขยะรายวัน 🚚",
            weight: "bold",
            size: "md",
            color: "#FFFFFF"
          },
          {
            type: "text",
            text: `ประจำวันที่ ${dateStr}`,
            size: "xs",
            color: "#A7F3D0",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          // Highlight Box (New Record)
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#18181B",
            borderColor: "#27272A",
            borderWidth: "1px",
            cornerRadius: "md",
            paddingAll": "md",
            contents: [
              {
                type: "text",
                text: "📥 เพิ่มรายการล่าสุดสำเร็จ",
                size: "xs",
                color: "#10B981",
                weight: "bold"
              },
              {
                type: "text",
                text: result.locationName,
                weight: "bold",
                size: "sm",
                color: "#FFFFFF",
                margin: "sm",
                maxLines: 1,
                ellipsize: true
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "sm",
                contents: [
                  {
                    type: "text",
                    text: `ประเภท: ${result.item}`,
                    size: "xs",
                    color: "#A1A1AA"
                  },
                  {
                    type: "text",
                    text: `คาดการณ์: ${result.weight} กก.`,
                    size: "xs",
                    color: "#34D399",
                    align: "end",
                    weight: "bold"
                  }
                ]
              }
            ]
          },
          // Separator
          {
            type: "separator",
            color: "#27272A",
            margin: "md"
          },
          // Title for list
          {
            type: "text",
            text: `📋 คิวงานวันเดียวกัน (รวมทั้งหมด ${pointsList.length} จุด):`,
            size: "xs",
            color: "#A1A1AA",
            weight: "bold",
            margin: "sm"
          },
          // Points List
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: pointContents
          }
        ]
      }
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const bypassSignature = process.env.BYPASS_LINE_SIGNATURE === "true";

    // 1. Signature Verification
    if (channelSecret && !bypassSignature) {
      if (!verifySignature(bodyText, signature, channelSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(bodyText);
    const events = payload.events || [];

    for (const event of events) {
      // Process text messages
      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text.trim();
        const replyToken = event.replyToken;

        // Fetch all locations to perform substring match
        const dbLocations = await db.location.findMany({
          select: { id: true, name: true }
        });

        console.log("Received text:", text);
        console.log("Fetched dbLocations count:", dbLocations.length);

        // 2. Parse Thai message
        const parsed = parseThaiPickupMessage(text, dbLocations);
        console.log("Parsed message result:", parsed);

        let responseText = "";
        let flexBubble: any = null;

        if (!parsed) {
          // Provide guidance on how to use the bot
          responseText = `สวัสดีครับ! 🤖 ผมคือระบบช่วยจัดคิวและแผนเดินรถรับขยะ

กรุณาพิมพ์ข้อมูลตามรูปแบบ เช่น:
"วันที่ 12 มิ.ย. รับขยะพลาสติกที่สยามพารากอน"
หรือ
"วันที่ 15/06 รับกระดาษที่วัดพระแก้ว 150 กก."

ระบบจะทำการลงตารางงาน และสรุปรายการรับขยะของวันเดียวกันส่งกลับมาให้คุณทันทีครับ!`;
        } else {
          // 3. Database operations in transaction
          const result = await db.$transaction(async (tx) => {
            let locationId = "";
            let finalLocationName = parsed.locationName;

            // Resolve location
            const matchedLoc = dbLocations.find((l) => l.name === parsed.locationName);
            if (matchedLoc) {
              locationId = matchedLoc.id;
            } else {
              // Create a new location with default Bangkok center coords
              const newLoc = await tx.location.create({
                data: {
                  name: parsed.locationName,
                  address: parsed.locationName,
                  latitude: 13.7563,
                  longitude: 100.5018,
                  expectedWeightKg: parsed.weightKg || 100,
                },
              });
              locationId = newLoc.id;
              finalLocationName = newLoc.name;
            }

            // Find or create Route for that date
            const targetDate = parsed.date;
            let route = await tx.route.findFirst({
              where: { date: targetDate },
            });

            if (!route) {
              // Find active vehicle to assign. Fallback to any vehicle if no active vehicle.
              let vehicle = await tx.vehicle.findFirst({
                where: { status: "ACTIVE" },
              });
              if (!vehicle) {
                vehicle = await tx.vehicle.findFirst();
              }

              if (!vehicle) {
                throw new Error("ไม่พบข้อมูลรถขยะในระบบ กรุณาเพิ่มข้อมูลรถขยะก่อน");
              }

              route = await tx.route.create({
                data: {
                  vehicleId: vehicle.id,
                  date: targetDate,
                  status: "PENDING",
                  totalWeightKg: 0,
                  distanceMeters: 0,
                  durationSeconds: 0,
                },
              });
            }

            // Find max sequence order to append point
            const lastPoint = await tx.routePoint.findFirst({
              where: { routeId: route.id },
              orderBy: { sequenceOrder: "desc" },
            });

            const nextSeq = lastPoint ? lastPoint.sequenceOrder + 1 : 1;
            const expectedWeight = parsed.weightKg || 100;

            // Create route point
            await tx.routePoint.create({
              data: {
                routeId: route.id,
                locationId,
                sequenceOrder: nextSeq,
                expectedWeightKg: expectedWeight,
                status: "PENDING",
                notes: parsed.item,
              },
            });

            // Update route weight
            const allPoints = await tx.routePoint.findMany({
              where: { routeId: route.id },
            });
            const totalWeight = allPoints.reduce((sum, p) => sum + p.expectedWeightKg, 0);

            await tx.route.update({
              where: { id: route.id },
              data: {
                totalWeightKg: totalWeight,
              },
            });

            return {
              date: targetDate,
              locationName: finalLocationName,
              item: parsed.item,
              weight: expectedWeight,
            };
          });

          // 4. Retrieve all route points scheduled for the same date
          const routesOnDate = await db.route.findMany({
            where: { date: result.date },
            include: {
              vehicle: true,
              routePoints: {
                orderBy: { sequenceOrder: "asc" },
                include: { location: true },
              },
            },
          });

          const thaiFormattedDate = result.date.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          let scheduleText = "";
          let counter = 1;
          for (const r of routesOnDate) {
            for (const pt of r.routePoints) {
              scheduleText += `\n• จุดที่ ${counter}: ${pt.location.name}\n  - งาน: ${pt.notes || "ขยะทั่วไป"}\n  - ปริมาณ: ${pt.expectedWeightKg} กก.\n  - ทะเบียนรถ: ${r.vehicle.plateNumber}\n  - สถานะ: ${pt.status === "PENDING" ? "ยังไม่ได้รับ (PENDING)" : pt.status}`;
              counter++;
            }
          }

          responseText = `บันทึกรายการสำเร็จ! 🎉

📌 รายการรับใหม่
📍 สถานที่: ${result.locationName}
📦 ประเภทขยะ: ${result.item}
⚖️ น้ำหนักคาดการณ์: ${result.weight} กก.
_________________
📋 คิวงานทั้งหมดประจำวันที่ ${thaiFormattedDate}:${scheduleText || "\n(ยังไม่มีคิวงานอื่น)"}`;

          // Generate Flex Message
          flexBubble = generateFlexBubble(thaiFormattedDate, result, routesOnDate);
        }

        // Send reply via LINE Reply API
        if (replyToken && replyToken !== "test-token" && channelAccessToken) {
          const messageObj = flexBubble || { type: "text", text: responseText };
          await sendLineReply(replyToken, messageObj, channelAccessToken);
        } else {
          // Log output during testing/signature bypass simulation
          console.log(`\n--- [LINE WEBHOOK SIMULATION REPLY] ---`);
          console.log(responseText);
          console.log(`----------------------------------------\n`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Webhook Server Error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

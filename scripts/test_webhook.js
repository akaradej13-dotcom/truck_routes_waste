async function run() {
  const url = "http://localhost:3001/api/line/webhook";
  
  const payload = {
    events: [
      {
        type: "message",
        replyToken: "test-token",
        source: {
          userId: "test-user-id"
        },
        message: {
          type: "text",
          text: "วันที่ 12 มิ.ย. เก็บเศษกระดาษที่เซ็นทรัล อีสต์วิลล์ 200 กิโลกรัม"
        }
      }
    ]
  };

  console.log("Sending UTF-8 payload to webhook...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response body:", data);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

run();

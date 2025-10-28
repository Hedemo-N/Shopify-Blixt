// 🚫 måste ligga högst upp – stänger av Remix body-parsern
export const config = {
  api: {
    bodyParser: false,
  },
};

import crypto from "crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";

// 🧠 Shopify webhook verifiering
export async function action({ request }: ActionFunctionArgs) {
  const startedAt = new Date().toISOString();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // ⚙️ Läs råbody byte-för-byte (viktigt!)
  const chunks: Uint8Array[] = [];
  for await (const chunk of request.body as any) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  // 🔍 Logga lite för felsökning
  console.log("RAW BODY LENGTH", rawBody.length);
  console.log(
    "RAW BODY SHA256",
    crypto.createHash("sha256").update(rawBody).digest("hex")
  );
  console.log("RAW BODY BASE64", rawBody.toString("base64").slice(0, 120));

  console.log("WEBHOOK RAW DEBUG", {
    startedAt,
    topic,
    shop,
    hasHmac: !!hmacHeader,
    secretLength: process.env.SHOPIFY_API_SECRET?.length,
    bodyPreview: rawBody.toString("utf8").slice(0, 200),
  });

  // 🔐 Beräkna HMAC på exakta bytes
  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  const matches = generatedHash === hmacHeader;

  console.log("WEBHOOK HMAC CHECK", {
    matches,
    digest: generatedHash,
    hmacHeader,
  });

  if (!matches) {
    console.error("❌ WEBHOOK VERIFY FAILED — HMAC mismatch!");
    return json({ ok: false, reason: "HMAC mismatch" }, { status: 401 });
  }

  // ✅ Om verifierad – parsa och logga
  const jsonBody = JSON.parse(rawBody.toString("utf8"));
  console.log("✅ WEBHOOK VERIFIED:", {
    topic,
    shop,
    orderId: jsonBody.id,
    totalPrice: jsonBody.total_price,
  });

  return json({ ok: true });
}

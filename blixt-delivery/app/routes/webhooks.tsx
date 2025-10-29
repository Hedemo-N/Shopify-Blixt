export const config = {
  api: { bodyParser: false },
};

import crypto from "crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // Läs exakta bytes som Shopify skickar
  const chunks: Uint8Array[] = [];
  for await (const chunk of request.body as any) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);
console.log("RAW BODY FULL", rawBody.toString("base64"));

  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  const matches = generatedHash === hmacHeader;
  console.log("WEBHOOK HMAC CHECK", { matches, digest: generatedHash, hmacHeader });

  if (!matches) {
    console.error("❌ WEBHOOK VERIFY FAILED — HMAC mismatch!");
    return json({ ok: false }, { status: 401 });
  }

  const body = JSON.parse(rawBody.toString("utf8"));
  console.log("✅ WEBHOOK VERIFIED", { topic, shop, orderId: body.id });
  return json({ ok: true });
}

export const config = {
  api: { bodyParser: false }, // ❗ viktigt – annars förstörs rådata
};

import crypto from "crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // 🧩 Läs exakt de bytes Shopify skickar (riktig rådata)
  const chunks: Uint8Array[] = [];
  for await (const chunk of request.body as any) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  // 🧠 Beräkna HMAC med din app secret (från "Webhooks are signed with ...")
  const secret = process.env.SHOPIFY_API_SECRET!;
  const generatedHash = crypto
    .createHmac("sha256", secret)
    .update(rawBody) // ✅ exakt rådata
    .digest("base64");

  const matches = generatedHash === hmacHeader;

  console.log("🧾 WEBHOOK HMAC CHECK", {
    matches,
    digest: generatedHash,
    hmacHeader,
    topic,
    shop,
  });

  if (!matches) {
    console.error("❌ WEBHOOK VERIFY FAILED — HMAC mismatch!");
    return json({ ok: false }, { status: 401 });
  }

  // ✅ Om HMAC stämmer → parse och hantera body
  const body = JSON.parse(rawBody.toString("utf8"));
  console.log("✅ WEBHOOK VERIFIED", { topic, shop, orderId: body.id });

  return json({ ok: true });
}

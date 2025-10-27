import crypto from "crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const startedAt = new Date().toISOString();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // Läs råbody som ArrayBuffer (inte text)
  const buffer = await request.arrayBuffer();
  const rawBody = Buffer.from(buffer);

  console.log("WEBHOOK RAW DEBUG", {
    startedAt,
    topic,
    shop,
    hasHmac: !!hmacHeader,
    secretLength: process.env.SHOPIFY_API_SECRET?.length,
    bodyPreview: rawBody.toString("utf8").slice(0, 200),
  });

  // Shopify HMAC verification — använd RAW body
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

  // ✅ Om verifierad — parsa body
  const jsonBody = JSON.parse(rawBody.toString("utf8"));
  console.log("✅ WEBHOOK VERIFIED:", {
    topic,
    shop,
    orderId: jsonBody.id,
    totalPrice: jsonBody.total_price,
  });

  // Här kan du lägga in ordern i Supabase senare
  return json({ ok: true });
}

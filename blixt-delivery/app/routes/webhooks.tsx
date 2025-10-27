import crypto from "crypto";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // 🧠 behåll denna import!

import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {

  const startedAt = new Date().toISOString();
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  const body = await request.text(); // OBS! Rå body behövs för HMAC
  const secret = process.env.SHOPIFY_API_SECRET!;

  console.log("WEBHOOK RAW DEBUG", {
    startedAt,
    topic,
    shop,
    webhookId,
    hasHmac: !!hmacHeader,
    secretLength: secret?.length,
    bodyPreview: body.slice(0, 180),
  });

  // 🧮 Beräkna egen HMAC för jämförelse
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  const matches = digest === hmacHeader;

  console.log("WEBHOOK HMAC CHECK", {
    matches,
    digest,
    hmacHeader,
  });

  // 🚫 Om fel signatur – stoppa direkt (401)
  if (!matches) {
    console.error("❌ WEBHOOK VERIFY FAILED — HMAC mismatch!");
    return json({ ok: false, reason: "HMAC mismatch" }, { status: 401 });
  }

  console.log("✅ WEBHOOK VERIFIED, forwarding to Shopify SDK...");

  try {
    // 🧩 Låt SDK verifiera & dispatcha vidare till callbacks i shopify.server.ts
    const context = await authenticate.webhook(request);
console.log("✅ WEBHOOK SDK dispatched:", {
  topic: context.topic,
  shop: context.shop,
  hasBody: "body" in context && !!(context as any).body,

});
return new Response("OK", { status: 200 });

  } catch (err: any) {
    if (err instanceof Response) {
      console.error("WEBHOOK: SDK threw Response", {
        status: err.status,
        statusText: err.statusText,
        topic,
        shop,
        webhookId,
      });
      return err;
    }

    console.error("WEBHOOK: verify/dispatch failed", {
      message: err?.message || String(err),
      topic,
      shop,
      webhookId,
    });
    return new Response("Internal Error", { status: 500 });
  }
}

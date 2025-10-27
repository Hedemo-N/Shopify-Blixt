// app/routes/webhooks.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Shopify pingar ibland med GET – svara 200 snabbt.
export async function loader(_args: LoaderFunctionArgs) {
  return new Response("OK");
}

export async function action({ request }: ActionFunctionArgs) {
  const startedAt = new Date().toISOString();

  // Plocka headers (detta konsumerar inte body)
  const topic = request.headers.get("x-shopify-topic") || "";
  const shop = request.headers.get("x-shopify-shop-domain") || "";
  const webhookId = request.headers.get("x-shopify-webhook-id") || "";
  const hasHmac = !!request.headers.get("x-shopify-hmac-sha256");
  const contentType = request.headers.get("content-type") || "";
  const contentLength = request.headers.get("content-length") || "";

  // Logga ett litet “incoming” block utan att röra body
  console.log("WEBHOOK: incoming", {
    startedAt,
    topic,
    shop,
    webhookId,
    hasHmac,
    contentType,
    contentLength,
  });

  // Om du VILL kika på payload för debug, använd en KLON:
  try {
    const previewClone = request.clone();
    const text = await previewClone.text();
    // Logga bara en liten snutt så vi inte spammar loggarna
    console.log("WEBHOOK: body preview", text.slice(0, 500));
  } catch (e) {
    console.warn("WEBHOOK: preview read failed (ignored)", String(e));
  }

  try {
    // VIKTIGT: Skicka ORIGINAL-requesten hit. Den läser body + verifierar HMAC,
    // och dispatchar sedan till dina callbacks i shopify.server.ts
    await authenticate.webhook(request);

    // Allt OK – svara 200 så Shopify inte gör retry
    return new Response("OK");
  } catch (err: any) {
    // HMAC fel, eller något i din callback kastade
    console.error("WEBHOOK: verify/dispatch failed", {
      message: err?.message || String(err),
      topic,
      shop,
      webhookId,
    });
    // Vid HMAC-fel är 401 rimligt (Shopify kan retry:a)
    return new Response("Unauthorized", { status: 401 });
  }
}

// app/routes/webhooks.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GET healthcheck
export async function loader() {
  return new Response("OK");
}

export async function action({ request }: ActionFunctionArgs) {
  const startedAt = new Date().toISOString();

  try {
    // För tydlig logg: vilka headers skickar Shopify?
    const h = request.headers;
    const topic = h.get("x-shopify-topic");
    const shop = h.get("x-shopify-shop-domain");
    const hmac = h.get("x-shopify-hmac-sha256");
    const webhookId = h.get("x-shopify-webhook-id");

    console.log("WEBHOOK: incoming", {
      startedAt,
      topic,
      shop,
      webhookId,
      hasHmac: Boolean(hmac),
      contentType: h.get("content-type"),
      contentLength: h.get("content-length"),
    });

    // Viktigt: låt shopify remix lib göra verifiering + dispatch
    await authenticate.webhook(request);

    console.log("WEBHOOK: verified & dispatched OK", { topic, shop, webhookId });
    return new Response(); // 200
  } catch (err: any) {
    // Vid fel: klona request och logga en preview av body + headers
    try {
      const clone = request.clone();
      const bodyPreview = await clone.text();
      const headersDump: Record<string, string> = {};
      request.headers.forEach((v, k) => (headersDump[k] = v));

      console.error("WEBHOOK: VERIFY FAILED", {
        startedAt,
        error: err?.message || String(err),
        headers: {
          "x-shopify-topic": headersDump["x-shopify-topic"],
          "x-shopify-shop-domain": headersDump["x-shopify-shop-domain"],
          "x-shopify-hmac-sha256": headersDump["x-shopify-hmac-sha256"],
          "content-type": headersDump["content-type"],
          "content-length": headersDump["content-length"],
        },
        bodyPreview: bodyPreview.slice(0, 2048), // max 2KB för logg
      });
    } catch (logErr: any) {
      console.error("WEBHOOK: verify failed, and logging also failed", {
        error: err?.message || String(err),
        logErr: logErr?.message || String(logErr),
      });
    }

    // Svara 401 så Shopify markerar försöket som misslyckat
    return new Response("Unauthorized", { status: 401 });
  }
}

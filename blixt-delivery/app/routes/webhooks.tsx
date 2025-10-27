// app/routes/webhooks.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader(_args: LoaderFunctionArgs) {
  return new Response("OK");
}

export async function action({ request }: ActionFunctionArgs) {
  const startedAt = new Date().toISOString();
  const topic = request.headers.get("x-shopify-topic") || "";
  const shop = request.headers.get("x-shopify-shop-domain") || "";
  const webhookId = request.headers.get("x-shopify-webhook-id") || "";
  const hasHmac = !!request.headers.get("x-shopify-hmac-sha256");
  const contentType = request.headers.get("content-type") || "";
  const contentLength = request.headers.get("content-length") || "";

  console.log("WEBHOOK: incoming", {
    startedAt,
    topic,
    shop,
    webhookId,
    hasHmac,
    contentType,
    contentLength,
  });

  // (Valfritt) debugga payload utan att konsumera original-body
  try {
    if (process.env.DEBUG_WEBHOOKS === "1") {
      const previewClone = request.clone();
      const txt = await previewClone.text();
      console.log("WEBHOOK: body preview", txt.slice(0, 500));
    }
  } catch (e) {
    console.warn("WEBHOOK: preview read failed (ignored)", String(e));
  }

  try {
    // Låt Shopify SDK verifiera HMAC och dispatcha till dina callbacks.
    // Viktigt: returnera responsen den ger (kan vara 200/401 etc).
    const res = await authenticate.webhook(request);
    return res;
  } catch (err: any) {
    // SDK kan kasta ett Response-objekt (t.ex. vid verifieringsfel). Returnera det som är.
    if (err instanceof Response) {
      // För tydligare logg
      console.error("WEBHOOK: SDK threw Response", {
        status: err.status,
        statusText: err.statusText,
        topic,
        shop,
        webhookId,
      });
      return err;
    }

    // Annars är det ett riktigt fel från din callback-kod.
    console.error("WEBHOOK: verify/dispatch failed", {
      message: err?.message || String(err),
      topic,
      shop,
      webhookId,
    });

    // 500 så Shopify kan retry:a (401 används normalt vid HMAC-fel)
    return new Response("Internal Error", { status: 500 });
  }
}

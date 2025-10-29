import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { buffer } from "micro";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = await buffer(req);
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
  const secret = process.env.SHOPIFY_API_SECRET!;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const match = digest === hmacHeader;

  console.log("🔍 HMAC CHECK", { match, digest, hmacHeader });

  if (!match) {
    res.status(401).send("HMAC verification failed");
    return;
  }

  const body = JSON.parse(rawBody.toString("utf8"));
  console.log("✅ VERIFIED", {
    topic: req.headers["x-shopify-topic"],
    shop: req.headers["x-shopify-shop-domain"],
    orderId: body.id,
  });

  res.status(200).json({ ok: true });
}

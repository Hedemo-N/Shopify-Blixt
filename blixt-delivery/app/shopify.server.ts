// app/shopify.server.ts
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// ⬇️ Lägg till dina beroenden (justera paths om dina filer ligger annorlunda)
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";
import { generateLabelPDF } from "./utils/pdf.server";          // <-- ändra om den ligger annorlunda
import { createShopifyFulfillment } from "./utils/shopify-fulfillment"; // <-- ändra om den ligger annorlunda

// Initiera Supabase & Resend (SRK = server-only!)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Hjälpare
const parseOmbudServiceCode = (code: string | undefined): string | null => {
  if (!code) return null;
  const m = code.match(/^ombud_(\d+)$/);
  return m ? m[1] : null;
};

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,                 // håll samma i hela appen
  scopes: process.env.SCOPES?.split(","),           // ex: read_orders,write_fulfillments,read_products
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: { unstable_newEmbeddedAuthStrategy: true, removeRest: true },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),

  webhooks: {
    // A) Avinstallation – rensa butikens data (justera tabellnamn vid behov)
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (_topic, shop) => {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "public"."Session" WHERE "shop" = $1`,
          shop
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "public"."shopify_shops" WHERE "shop" = $1`,
          shop
        );
      },
    },

    // B) GDPR (räcker att logga/svara 200)
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (_t, shop, body) => {
        console.log("GDPR data request", shop, body);
      },
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (_t, shop, body) => {
        console.log("GDPR redact", shop, body);
      },
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (_t, shop, body) => {
        console.log("Shop redact", shop, body);
      },
    },

  APP_SCOPES_UPDATE: {
  deliveryMethod: DeliveryMethod.Http,
  callbackUrl: "/webhooks",
  // Signaturen är: (topic, shop, body, webhookId) — ingen "session" här
  callback: async (_t, shop, body: any, _webhookId) => {
    const current = Array.isArray(body?.current) ? body.current : [];
    await prisma.session.updateMany({
      where: { shop },
      data: { scope: current.join(",") },
    });
  },
},


    // C) 💥 ORDERS_CREATE – din gamla route-action, nu som callback
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (_topic, shop, payload: any) => {
        try {
          // 1) Token + metadata för butiken
          const { data: shopRow, error: shopErr } = await supabase
            .from("shopify_shops")
            .select("access_token, email, user_id")
            .eq("shop", shop)
            .single();

          if (shopErr || !shopRow?.access_token) {
            console.error("❌ No access_token for shop:", shop, shopErr);
            return;
          }
          const SHOPIFY_ADMIN_API_TOKEN = shopRow.access_token;
          const storeEmail = shopRow.email;
          const user_id = shopRow.user_id;

          // 2) Extrahera data från payload
          const shippingLine = payload?.shipping_lines?.[0];
          const serviceCode = shippingLine?.code ?? "hemleverans";
          const ombudId = parseOmbudServiceCode(serviceCode);

          const shopifyOrderId = payload?.id;
          const customer = payload?.customer;
          const address = payload?.shipping_address;
          const mail =
            customer?.email || address?.email || payload?.email || null;

          // 3) Ombuddata (om finns)
          let ombudData: any = null;
          if (ombudId) {
            const { data: ombudRow } = await supabase
              .from("paketskåp_ombud")
              .select("*")
              .eq("id", ombudId)
              .single();
            if (ombudRow) ombudData = ombudRow;
          }

          // 4) Skapa order-rad i Supabase
          const orderData: any = {
            shopify_order_id: shopifyOrderId,
            name: `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim(),
            address1: address?.address1,
            city: address?.city,
            postalnumber: address?.zip,
            phone: customer?.phone,
            order_type: ombudData ? "ombud" : "hemleverans",
            source: "shopify",
            shop,
            user_id,
            mail,
          };
          if (ombudData) {
            orderData.ombud_name = ombudData.ombud_name;
            orderData.ombud_adress = ombudData.ombud_adress;
            orderData.ombud_telefon = ombudData.ombud_telefon;
            orderData.ombud_lat_long = ombudData.lat_long;
          }

          const { data: created, error: insertError } = await supabase
            .from("orders")
            .insert([orderData])
            .select()
            .single();
          if (insertError || !created) {
            console.error("❌ Supabase insert error:", insertError);
            return;
          }
          const order = created;

          // 5) Line items → fulfillment
          type ShopifyLineItem = { id: number; quantity: number };
          const lineItems: ShopifyLineItem[] = payload?.line_items || [];
          const fulfillmentLineItems = lineItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          }));

          // 6) Hämta location_id (håll samma API-version som ovan)
          let locationId: number | undefined = undefined;
          try {
            const res = await fetch(
              `https://${shop}/admin/api/2025-01/orders/${shopifyOrderId}.json`,
              {
                headers: {
                  "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
                  "Content-Type": "application/json",
                },
              }
            );
            const orderJson = await res.json();
            locationId = orderJson?.order?.line_items?.[0]?.location_id;
            if (!locationId) {
              console.warn("⚠️ Inget location_id hittat på ordern");
            }
          } catch (err) {
            console.error("❌ Fel vid hämtning av location_id:", err);
          }

          // 7) Skapa PDF (vid behov)
          const hasEnoughDataForPdf =
            order.order_type === "hemleverans" ||
            (order.order_type === "ombud" &&
              order.ombud_name &&
              order.ombud_adress);

          let pdfUrl: string | null = null;
          if (hasEnoughDataForPdf) {
            const pdfBytes = await generateLabelPDF(order);
            const fileName = `etikett-${uuidv4()}.pdf`;

            const { error: uploadError } = await supabase.storage
              .from("etiketter")
              .upload(fileName, pdfBytes, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from("etiketter")
                .getPublicUrl(fileName);
              pdfUrl = publicUrlData?.publicUrl ?? null;
            } else {
              console.error("❌ PDF upload error:", uploadError);
            }
          }

          // 8) Skapa fulfillment i Shopify
          try {
            await createShopifyFulfillment({
              shop,
              shopifyOrderId,
              accessToken: SHOPIFY_ADMIN_API_TOKEN,
              trackingUrl: "https://blixt-bokning.vercel.app/auth",
              trackingNumber: String(shopifyOrderId), // om du har detta fält
              courierName: "Blixt Delivery",
              lineItems: fulfillmentLineItems,
              locationId,
            });
          } catch (err) {
            console.error("❌ createShopifyFulfillment failed:", err);
          }

          // 9) Spara PDF-URL + maila etikett till butiken
          if (pdfUrl) {
            await supabase.from("orders")
              .update({ pdf_url: pdfUrl })
              .eq("id", order.id);

            if (storeEmail) {
              await resend.emails.send({
                from: "noreply@blixtdelivery.se",
                to: [storeEmail],
                subject: `Blixt Delivery – etikett till order ${shopifyOrderId}`,
                html: `
                  <h2>Här är din leveransetikett!</h2>
                  <p>Tryck på länken nedan för att ladda ner och skriva ut etiketten:</p>
                  <p><a href="${pdfUrl}">${pdfUrl}</a></p>
                  <hr />
                  <p>Frågor? Kontakta oss på info@blixtdelivery.se</p>
                `,
              });
            }
          }

          console.log("✅ ORDERS_CREATE processed for", shop, shopifyOrderId);
        } catch (err) {
          console.error("❌ ORDERS_CREATE general error", err);
        }
      },
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

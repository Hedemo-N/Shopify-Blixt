import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";
import type { ActionFunctionArgs } from "@remix-run/node";
import { generateLabelPDF } from "../utils/pdf.server";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { createShopifyFulfillment } from "./shopify-fulfillment";


type ShopifyLineItem = {
  id: number;
  quantity: number;
  // Lägg till mer om du vill ha extra fält!
};

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const parseOmbudServiceCode = (code: string | undefined): string | null => {
  if (!code) return null;
  const match = code.match(/^ombud_(\d+)$/);
  return match ? match[1] : null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const payload = await request.json();

    const shop =
      payload.shop ||
      request.headers.get("x-shopify-shop-domain") ||
      payload?.store_domain;

    if (!shop) {
      console.error("❌ Ingen shop-domain hittad!");
      return json({ ok: false, error: "No shop domain" });
    }

    const { data: shopTokenData, error: shopTokenError } = await supabase
      .from("shopify_shops")
      .select("access_token")
      .eq("shop", shop)
      .single();

    if (shopTokenError || !shopTokenData?.access_token) {
      console.error("❌ Kunde inte hämta access_token för butik:", shop, shopTokenError);
      return json({ ok: false, error: "No access_token for this shop" });
    }
    const SHOPIFY_ADMIN_API_TOKEN = shopTokenData.access_token;

    const { data: shopEmailData } = await supabase
      .from("shopify_shops")
      .select("email")
      .eq("shop", shop)
      .single();
    const storeEmail = shopEmailData?.email;
    if (!storeEmail) throw new Error("Kan inte skicka etikett – ingen mottagaradress för butiken.");

    const { data: shopifyShop } = await supabase
      .from("shopify_shops")
      .select("user_id")
      .eq("shop", shop)
      .single();

    const user_id = shopifyShop?.user_id;
    const shippingLine = payload.shipping_lines?.[0];
    const serviceCode = shippingLine?.code ?? "hemleverans";
    const ombudId = parseOmbudServiceCode(serviceCode);

    const shopifyOrderId = payload.id;
    const customer = payload.customer;
    const address = payload.shipping_address;
    const mail =
      customer?.email ||
      address?.email ||
      payload?.email ||
      null;

    let ombudData = null;
    if (ombudId) {
      const { data: ombudRow, error: ombudError } = await supabase
        .from("paketskåp_ombud")
        .select("*")
        .eq("id", ombudId)
        .single();
      if (!ombudError && ombudRow) ombudData = ombudRow;
    }

    const orderData: any = {
      shopify_order_id: shopifyOrderId,
      name: `${customer.first_name} ${customer.last_name}`,
      address1: address.address1,
      city: address.city,
      postalnumber: address.zip,
      phone: customer.phone,
      order_type: ombudData ? "ombud" : "hemleverans",
      source: "shopify",
      shop: shop,
      user_id: user_id,
      mail: mail,
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
      console.error("❌ Fel vid insättning i Supabase:", insertError);
      return json({ ok: false });
    }
    const order = created;

    // Plocka line_items direkt från payloaden
    const shopifyLineItems: ShopifyLineItem[] = payload.line_items || [];
const fulfillmentLineItems = shopifyLineItems.map((item) => ({
  id: item.id,
  quantity: item.quantity,
}));

    const hasEnoughDataForPdf =
      order.order_type === "hemleverans" ||
      (order.order_type === "ombud" && order.ombud_name && order.ombud_adress);

    let pdfUrl = null;

    if (hasEnoughDataForPdf) {
      const pdfBytes = await generateLabelPDF(order);
      const fileName = `etikett-${uuidv4()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("etiketter")
        .upload(fileName, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Fel vid PDF-upload:", uploadError);
        return json({ ok: false });
      }

      const { data: publicUrlData } = supabase.storage
        .from("etiketter")
        .getPublicUrl(fileName);

      pdfUrl = publicUrlData?.publicUrl;
        // Efter du har shop, shopifyOrderId och SHOPIFY_ADMIN_API_TOKEN
        let locationId: number | undefined = undefined;
        try {
          const orderRes = await fetch(`https://${shop}/admin/api/2023-10/orders/${shopifyOrderId}.json`, {
            headers: {
              "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
              "Content-Type": "application/json"
            }
          });
          const orderJson = await orderRes.json();
          // Ta första line_item (ofta alla från samma location)
          locationId = orderJson?.order?.line_items?.[0]?.location_id;
          if (!locationId) {
            console.warn("⚠️ Hittade inget location_id på ordern!", orderJson?.order);
          }
        } catch (err) {
          console.error("❌ Fel vid hämtning av location_id:", err);
        }

      if (pdfUrl) {
        await createShopifyFulfillment({
          shop,
          shopifyOrderId,
          accessToken: SHOPIFY_ADMIN_API_TOKEN,
          trackingUrl: "https://blixt-bokning.vercel.app/auth",
          trackingNumber: order.order_id,
          courierName: "Blixt Delivery",
          lineItems: fulfillmentLineItems,
          locationId
        });

        await supabase
          .from("orders")
          .update({ pdf_url: pdfUrl })
          .eq("id", order.id);

        await resend.emails.send({
          from: "noreply@blixtdelivery.se",
          to: [storeEmail],
          subject: `Blixt Delivery – etikett till order ${shopifyOrderId}`,
          html: `
            <h2>Här är din leveransetikett!</h2>
            <p>Tryck på länken nedan för att ladda ner och skriva ut etiketten till din beställning:</p>
            <p><a href="${pdfUrl}">${pdfUrl}</a></p>
            <hr />
            <p>Frågor? Kontakta oss på info@blixtdelivery.se</p>
          `,
        });
        console.log("🚀 Etikett-mail skickat till butik:", storeEmail, pdfUrl);
      }
    } else {
      console.warn("⚠️ Hoppar över PDF – saknar ombudinfo.");
    }

    console.log("✅ Shopify order skapad:", order.id);
    return json({ ok: true, pdf_url: pdfUrl });
  } catch (err) {
    console.error("❌ Generellt fel i webhook:", err);
    return json({ ok: false, error: "Internal error" });
  }
};

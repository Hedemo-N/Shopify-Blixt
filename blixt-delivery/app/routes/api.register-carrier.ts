// app/routes/api.register-carrier.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 1) Hämta shop + access_token från Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      return json({ success: false, error: "Saknar shop/access_token i Supabase" }, { status: 500 });
    }

    const shop = row.shop;                  // ex: hedens-skor.myshopify.com
    const token = row.access_token;
    const origin = new URL(request.url).origin; // ex: https://shopify-blixt.vercel.app
    const callbackUrl = `${origin}/api/shipping-rates`;

    // 2) Finns det redan en carrier service med vårt namn? (GET)
    const listRes = await fetch(`https://${shop}/admin/api/2025-01/carrier_services.json`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    if (!listRes.ok) {
      const t = await listRes.text();
      return json({ success: false, error: `List failed: ${listRes.status} ${t}` }, { status: 500 });
    }
    const listJson = await listRes.json();
    const existing = (listJson?.carrier_services || []).find((c: any) => c.name === "Blixt Delivery");

    // 3) Skapa eller uppdatera via REST
    if (existing) {
      // Uppdatera befintlig
      const updateRes = await fetch(
        `https://${shop}/admin/api/2025-01/carrier_services/${existing.id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            carrier_service: {
              id: existing.id,
              name: "Blixt Delivery",
              callback_url: callbackUrl,
              service_discovery: true,
              format: "json",
              active: true,
            },
          }),
        }
      );
      if (!updateRes.ok) {
        const t = await updateRes.text();
        return json({ success: false, error: `Update failed: ${updateRes.status} ${t}` }, { status: 500 });
      }
      const updateJson = await updateRes.json();
      return json({ success: true, mode: "updated", result: updateJson });
    } else {
      // Skapa ny
      const createRes = await fetch(`https://${shop}/admin/api/2025-01/carrier_services.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          carrier_service: {
            name: "Blixt Delivery",
            callback_url: callbackUrl,
            service_discovery: true,
            format: "json",
            active: true,
          },
        }),
      });
      if (!createRes.ok) {
        const t = await createRes.text();
        return json({ success: false, error: `Create failed: ${createRes.status} ${t}` }, { status: 500 });
      }
      const createJson = await createRes.json();
      return json({ success: true, mode: "created", result: createJson });
    }
  } catch (e: any) {
    return json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

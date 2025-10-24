// app/routes/api.register-webhooks.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Hämta senast anslutna butik (justera vid flera shops)
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      return json({ ok: false, error: "Saknar shop/access_token i Supabase" }, { status: 500 });
    }

    const shop = row.shop;                // ex: hedens-skor.myshopify.com
    const token = row.access_token;
    const origin = new URL(request.url).origin; // ex: https://shopify-blixt.vercel.app
    const address = `${origin}/webhooks`;

    const topics = ["orders/create"]; // lägg till fler vid behov
    const results: any[] = [];

    for (const topic of topics) {
      const res = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format: "json",
          },
        }),
      });

      const data = await res.json();
      results.push({ topic, status: res.status, data });
    }

    return json({ ok: true, results });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// app/routes/api.debug-webhooks.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
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
      return json({ ok: false, error: "Saknar shop/access_token i Supabase" }, { status: 500 });
    }

    const shop = row.shop;
    const token = row.access_token;

    const res = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Accept": "application/json",
      },
    });

    const data = await res.json();
    return json({ ok: true, webhooks: data });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

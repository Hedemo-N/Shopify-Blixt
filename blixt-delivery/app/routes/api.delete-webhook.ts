import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader() {
  // 🔹 Skapa Supabase-klient
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 🔹 Hämta butik + access token
  const { data: row, error } = await supabase
    .from("shopify_shops")
    .select("shop, access_token")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !row) {
    console.error("❌ Ingen shop hittades i Supabase:", error);
    return json({ ok: false, error: "Ingen shop hittades" }, { status: 500 });
  }

  const shop = row.shop;
  const token = row.access_token;

  // 🔹 Hämta alla webhooks
  const res = await fetch(`https://${shop}/admin/api/2025-04/webhooks.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });

  const { webhooks } = await res.json();

  // 🔹 Ta bort alla webhooks
  for (const w of webhooks) {
    await fetch(`https://${shop}/admin/api/2025-04/webhooks/${w.id}.json`, {
      method: "DELETE",
      headers: { "X-Shopify-Access-Token": token },
    });
  }

  return json({ ok: true, deleted: webhooks.length });
}

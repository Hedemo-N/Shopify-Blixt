import { json, redirect } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

// Din Supabase instans
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL!; // t.ex. "https://blixtdelivery.se"

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);

  // 1. Få ut shop och code från query params
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");

  if (!shop || !code) {
    return json({ error: "Saknar shop eller code" }, { status: 400 });
  }

  // 2. Byt code mot access_token hos Shopify
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("❌ Token exchange error:", err);
    return json({ error: "Token exchange failed" }, { status: 400 });
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  // 3. Spara shop + access_token i Supabase
  const { data, error } = await supabase
    .from("shopify_shops")
    .upsert([
      {
        shop,
        access_token: accessToken,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: "shop" });

  if (error) {
    console.error("❌ Fel vid sparning av shop:", error);
    return json({ error: "Could not save shop" }, { status: 500 });
  }

  // 4. Skicka tillbaka till din app eller till en “Tack för installationen”-sida
  return redirect(`${APP_URL}/onboarding-success`);
};

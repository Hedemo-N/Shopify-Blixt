import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

const CREATE_CARRIER_SERVICE = `
mutation carrierServiceCreate($carrierService: CarrierServiceInput!) {
  carrierServiceCreate(carrierService: $carrierService) {
    userErrors { field message }
    carrierService { id name callbackUrl }
  }
}
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Hämta shop + access_token från Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Välj senaste raden (justera om du har flera shops)
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      return json({ success: false, error: "Saknar shop/access_token i Supabase" }, { status: 500 });
    }

    const shop = row.shop;            // t.ex. hedens-skor.myshopify.com
    const token = row.access_token;
    const origin = new URL(request.url).origin; // https://shopify-blixt.vercel.app

    const variables = {
      carrierService: {
        name: "Blixt Delivery",
        callbackUrl: `${origin}/api/shipping-rates`,
        serviceDiscovery: true,
        format: "json",
      },
    };

    const resp = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query: CREATE_CARRIER_SERVICE, variables }),
    });

    const data = await resp.json();
    const errs = data?.data?.carrierServiceCreate?.userErrors ?? [];

    if (errs.length) {
      return json({ success: false, error: errs.map((e: any) => e.message).join(", ") }, { status: 400 });
    }

    return json({ success: true, result: data });
  } catch (e: any) {
    return json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// app/routes/api.register-carrier.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

const CREATE_CARRIER_SERVICE = `
mutation carrierServiceCreate($input: CarrierServiceCreateInput!) {
  carrierServiceCreate(input: $input) {
    carrierService {
      id
      name
      callbackUrl
      active
      serviceDiscovery
    }
    userErrors {
      field
      message
    }
  }
}
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 1) Hämta shop + access_token från Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ta senaste posten (justera vid behov om du har flera shops)
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      return json(
        { success: false, error: "Saknar shop eller access_token i Supabase." },
        { status: 500 }
      );
    }

    const shop = row.shop;                 // ex: hedens-skor.myshopify.com
    const token = row.access_token;
    const origin = new URL(request.url).origin; // ex: https://shopify-blixt.vercel.app

    // 2) Variabler enligt rätt schema (input + enum JSON)
    const variables = {
      input: {
        name: "Blixt Delivery",
        callbackUrl: `${origin}/api/shipping-rates`,
        serviceDiscovery: true,
        active: true,
        format: "JSON", // OBS: enum-värde, inte "json"
      },
    };

    // 3) Kör Admin GraphQL med butiks-token
    const resp = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: CREATE_CARRIER_SERVICE, variables }),
    });

    // Om Shopify svarar med en icke-200, returnera texten för felsökning
    if (!resp.ok) {
      const text = await resp.text();
      return json(
        { success: false, error: `HTTP ${resp.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await resp.json();

    // 4) Hantera GraphQL errors + userErrors
    if (Array.isArray(data.errors) && data.errors.length) {
      return json(
        { success: false, error: data.errors.map((e: any) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const userErrors = data?.data?.carrierServiceCreate?.userErrors ?? [];
    if (userErrors.length) {
      return json(
        { success: false, error: userErrors.map((e: any) => e.message).join(", ") },
        { status: 400 }
      );
    }

    // 5) Klart
    return json({ success: true, result: data });
  } catch (e: any) {
    return json(
      { success: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

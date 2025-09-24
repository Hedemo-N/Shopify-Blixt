// app/routes/api.register-carrier.ts
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
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
    // 1) Hämta shop + access_token från Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Om du har flera shops per user: välj den som matchar nuvarande butik.
    // Här antar vi att appen är installerad i EN butik (din dev-butik).
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      const msg = encodeURIComponent("Saknar shop/access_token i Supabase");
      return redirect(`/settings?carrier=fail&msg=${msg}`);
    }

    const shop = row.shop; // t.ex. hedens-skor.myshopify.com
    const token = row.access_token;

    // 2) Bygg callbackUrl dynamiskt
    const origin = new URL(request.url).origin; // https://shopify-blixt.vercel.app
    const variables = {
      carrierService: {
        name: "Blixt Delivery",
        callbackUrl: `${origin}/api/shipping-rates`,
        serviceDiscovery: true,
        format: "json",
      },
    };

    // 3) Kör Admin GraphQL med ditt sparade access_token
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

    const errs = data?.data?.carrierServiceCreate?.userErrors;
    if (errs?.length) {
      const msg = encodeURIComponent(errs.map((e: any) => e.message).join(", "));
      return redirect(`/settings?carrier=fail&msg=${msg}`);
    }

    return redirect(`/settings?carrier=ok`);
  } catch (e: any) {
    const msg = encodeURIComponent(e?.message ?? String(e));
    return redirect(`/settings?carrier=fail&msg=${msg}`);
  }
}

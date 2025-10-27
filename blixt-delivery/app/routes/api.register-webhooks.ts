// app/routes/api.register-webhooks.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

type WebhookTopic = "orders/create" | "app/uninstalled"; // lägg till fler vid behov

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) Hämta butik + access token (justera om du kör multi-tenant i UI)
    const { data: row, error } = await supabase
      .from("shopify_shops")
      .select("shop, access_token")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !row?.shop || !row?.access_token) {
      return json(
        { ok: false, error: "Saknar shop/access_token i Supabase" },
        { status: 500 }
      );
    }

    const shop = row.shop; // t.ex. hedens-skor.myshopify.com
    const token = row.access_token;
    const origin = new URL(request.url).origin; // ex: https://shopify-blixt.vercel.app
    const address = `${origin}/webhooks`; // vår webhook-endpoint i appen

    // 2) De topics vi vill ha
    const topics: WebhookTopic[] = ["orders/create", "app/uninstalled"];

    // 3) Små hjälpare för Shopify Admin API
    const api = (path: string, init?: RequestInit) =>
      fetch(`https://${shop}/admin/api/2025-01${path}`, {
        ...init,
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(init?.headers || {}),
        },
      });

    const listWebhooks = async () => {
      const res = await api(`/webhooks.json`, { method: "GET" });
      return { status: res.status, data: await res.json() };
    };

    const deleteWebhook = async (id: number) => {
      const res = await api(`/webhooks/${id}.json`, { method: "DELETE" });
      return res.status;
    };

    const createWebhook = async (topic: WebhookTopic) => {
      const body = { webhook: { topic, address, format: "json" } };
      const res = await api(`/webhooks.json`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { status: res.status, data: await res.json() };
    };

    // 4) Idempotent upsert: rensa ev. dubletter för (topic,address) och skapa en färsk
    const results: Array<{ topic: WebhookTopic; status: number; id: number | null; errors: any }> = [];

    const { data: listData } = await listWebhooks();
    const existing: any[] = listData?.webhooks ?? [];

    for (const topic of topics) {
      const matches = existing.filter(
        (w) =>
          w.topic === topic &&
          normalizeAddress(w.address) === normalizeAddress(address)
      );

      for (const m of matches) {
        await deleteWebhook(m.id);
      }

      const created = await createWebhook(topic);
      results.push({
        topic,
        status: created.status,
        id: created.data?.webhook?.id ?? null,
        errors: created.data?.errors ?? null,
      });
    }

    const ok = results.every((r) => String(r.status).startsWith("2"));
    return json({ ok, address, results });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function normalizeAddress(addr: string): string {
  try {
    const url = new URL(addr);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return addr;
  }
}

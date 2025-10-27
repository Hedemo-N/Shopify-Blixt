// app/routes/api.register-webhooks.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

type WebhookTopic =
  | "orders/create"
  | "app/uninstalled"; // lägg till fler vid behov

export async function loader({ request }: LoaderFunctionArgs) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) Hämta senast anslutna butik (justera om du har multi-tenant UI)
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

  const shop = row.shop;                  // ex: hedens-skor.myshopify.com
  const token = row.access_token;
  const origin = new URL(request.url).origin; // ex: https://shopify-blixt.vercel.app
  const address = `${origin}/webhooks`;   // vår webhook-endpoint i appen

  // 2) De topics du vill ha
  const topics: WebhookTopic[] = [
    "orders/create",
    "app/uninstalled",
  ];

  // 3) Hjälpare
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

  async function listWebhooks() {
    const res = await api(`/webhooks.json`, { method: "GET" });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function deleteWebhook(id: number) {
    const res = await api(`/webhooks/${id}.json`, { method: "DELETE" });
    // 200/204 ok, 404 ignoreras
    return res.status;
  }

  async function createWebhook(topic: WebhookTopic) {
    const body = {
      webhook: { topic, address, format: "json" },
    };
    const res = await api(`/webhooks.json`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // 4) Idempotent upsert: rensa dubletter per (topic,address), skapa en frisk
  const results: any[] = [];
  try {
    const existing = await listWebhooks();
    const existingList: any[] = existing.data?.webhooks ?? [];

    for (const topic of topics) {
      // Hitta alla befintliga för samma adress + topic
      const matches = existingList.filter(
        (w) => w.address === address && w.topic === topic
      );

      // Behåll max 1 (den senaste) → rensa övriga
      if (matches.length > 1) {
        // sortera på id eller created_at om du vill, här raderar vi alla & skapar ny
        for (const m of matches) {
          await deleteWebhook(m.id);
        }
      } else if (matches.length === 1) {
        // Finns redan exakt en — radera och skapa om (så vi vet att configen är fräsch)
        await deleteWebhook(matches[0].id);
      }

      // Skapa ny
      const created = await createWebhook(topic);
      results.push({ topic, created });
    }

    return json({ ok: true, address, results });
  } catch (e: any) {
    return json(
      { ok: false, address, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

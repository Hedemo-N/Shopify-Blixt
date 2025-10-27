// app/routes/api.register-webhooks.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

type WebhookTopic =
  | "orders/create"
  | "app/uninstalled"; // lägg till fler vid behov

export async function loader({ request }: LoaderFunctionArgs) {
  const startedAt = new Date().toISOString();
  const origin = new URL(request.url).origin;

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
      console.error("REG-WEBHOOKS: missing shop/access_token", { error });
      return json(
        { ok: false, error: "Saknar shop/access_token i Supabase" },
        { status: 500 }
      );
    }

    const shop = row.shop;                  // t.ex. hedens-skor.myshopify.com
    const token = row.access_token;
    const address = `${origin}/webhooks`;   // vår webhook-endpoint i appen

    console.log("REG-WEBHOOKS: start", { startedAt, shop, address });

    // 2) De topics vi vill ha
    const topics: WebhookTopic[] = [
      "orders/create",
      "app/uninstalled",
    ];

    // 3) Små hjälpare för Shopify Admin API
    const api = async (path: string, init?: RequestInit) => {
      const res = await fetch(`https://${shop}/admin/api/2025-01${path}`, {
        ...init,
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(init?.headers || {}),
        },
      });
      return res;
    };

    const listWebhooks = async () => {
      const res = await api(`/webhooks.json`, { method: "GET" });
      const data = await safeJson(res);
      const count = Array.isArray(data?.webhooks) ? data.webhooks.length : 0;
      console.log("REG-WEBHOOKS: list", { status: res.status, count });
      return { res, data };
    };

    const deleteWebhook = async (id: number) => {
      const res = await api(`/webhooks/${id}.json`, { method: "DELETE" });
      console.log("REG-WEBHOOKS: delete", { id, status: res.status });
      return res.status;
    };

    const createWebhook = async (topic: WebhookTopic) => {
      const body = { webhook: { topic, address, format: "json" } };
      const res = await api(`/webhooks.json`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      console.log("REG-WEBHOOKS: create", {
        topic,
        status: res.status,
        id: data?.webhook?.id ?? null,
        errors: data?.errors ?? null,
      });
      return { res, data };
    };

    // 4) Idempotent upsert: rensa ev. dubletter för (topic,address) och skapa en färsk
    const results: Array<{ topic: WebhookTopic; status: number; id: number | null; errors: any }> = [];
    const { data: listData } = await listWebhooks();
    const existing: any[] = listData?.webhooks ?? [];

    for (const topic of topics) {
      const matches = existing.filter(
        (w) =>
          w.topic === topic &&
          (w.address === address ||
            normalizeAddress(w.address) === normalizeAddress(address))
      );

      // Rensa alla träffar för att vara bomb-säker på att vi bara har en fräsch
      for (const m of matches) {
        await deleteWebhook(m.id);
      }

      const { res: createRes, data } = await createWebhook(topic);
      results.push({
        topic,
        status: createRes.status,
        id: data?.webhook?.id ?? null,
        errors: data?.errors ?? null,
      });
    }

    const ok = results.every((r) => String(r.status).startsWith("2"));
    console.log("REG-WEBHOOKS: done", { ok, address, results });

    return json({ ok, address, results });
  } catch (e: any) {
    console.error("REG-WEBHOOKS: fatal", { error: e?.message || String(e) });
    return json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

/** Normaliserar webhook-adresser (tar bort extra slashar etc) för jämförelse */
function normalizeAddress(addr: string): string {
  try {
    const url = new URL(addr);
    // ta bort trailing slashes
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return addr;
  }
}

/** Robust JSON-avkodning + logg vid non-JSON-svar (t.ex. HTML fel-sida) */
async function safeJson(res: Response) {
  try {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.warn("REG-WEBHOOKS: non-JSON response", {
        status: res.status,
        preview: text.slice(0, 200),
      });
      return null;
    }
  } catch {
    return null;
  }
}

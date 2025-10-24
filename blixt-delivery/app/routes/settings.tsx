import { useState } from "react";
import { Page, Card, Button, Text, InlineStack, BlockStack } from "@shopify/polaris";

export default function Settings() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"carrier" | "webhooks" | null>(null);

  async function callJson(url: string, kind: "carrier" | "webhooks") {
    try {
      setLoading(kind);
      setStatus(null);
      const res = await fetch(url); // GET
      const json = await res.json();
      // Försök läsa userErrors om de finns
      const errs =
        json?.result?.data?.carrierServiceCreate?.userErrors ||
        json?.errors ||
        json?.userErrors ||
        [];
      if (Array.isArray(errs) && errs.length) {
        setStatus("❌ " + errs.map((e: any) => e.message || String(e)).join(", "));
      } else {
        setStatus("✅ Klart: " + (json.ok || json.success ? "OK" : "Se svar i /api/debug*"));
      }
    } catch (e: any) {
      setStatus("❌ " + (e?.message ?? String(e)));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Page title="Inställningar">
      <Card>
        <BlockStack gap="300">
          <Text as="p" variant="bodyMd">
            Registrera/uppdatera Blixt som fraktbärare & webhooks i din butik.
          </Text>

          <InlineStack gap="200">
            <Button
              onClick={() => callJson("/api/register-carrier", "carrier")}
              loading={loading === "carrier"}
              variant="primary"
            >
              Aktivera frakt (Carrier)
            </Button>

            <Button
              onClick={() => callJson("/api/register-webhooks", "webhooks")}
              loading={loading === "webhooks"}
              variant="primary"
            >
              Registrera webhooks
            </Button>

            <Button url="/api/debug-webhooks" external>
              Visa webhooks (debug)
            </Button>
          </InlineStack>

          {status && (
            <Text as="p" variant="bodyMd">
              {status}
            </Text>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}

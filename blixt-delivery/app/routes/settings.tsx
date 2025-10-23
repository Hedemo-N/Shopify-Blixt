import { useState } from "react";
import { Page, Card, Button, Text } from "@shopify/polaris";

export default function Settings() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/register-carrier"); // GET
      const json = await res.json();
      if (json?.success) {
        const errs = json.result?.data?.carrierServiceCreate?.userErrors;
        if (errs?.length) {
          setStatus("❌ " + errs.map((e: any) => e.message).join(", "));
        } else {
          setStatus("✅ Carrier Service registrerad!");
        }
      } else {
        setStatus("❌ " + (json?.error ?? "Okänt fel"));
      }
    } catch (e: any) {
      setStatus("❌ " + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Inställningar">
      <Card>
        <Text as="p" variant="bodyMd">
          Registrera/uppdatera Blixt som fraktbärare i din butik.
        </Text>
        <div style={{ marginTop: 12 }}>
          <Button onClick={handleRegister} loading={loading} variant="primary">
            Aktivera frakt
          </Button>
        </div>
        <div style={{ marginTop: 12 }}>
  <Button url="/api/debug-carriers" external>
    Visa Carrier Services (debug)
  </Button>
</div>

        {status && (
          <div style={{ marginTop: 12 }}>
            <Text as="p" variant="bodyMd">{status}</Text>
          </div>
        )}
      </Card>
    </Page>
  );
}

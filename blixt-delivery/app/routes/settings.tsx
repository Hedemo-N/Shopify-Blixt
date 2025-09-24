// app/routes/settings.tsx
import { Page, Card, Button, Text } from "@shopify/polaris";
import { useSearchParams } from "@remix-run/react";

export default function Settings() {
  const [params] = useSearchParams();
  const ok = params.get("carrier") === "ok";
  const fail = params.get("carrier") === "fail";
  const msg = params.get("msg") ?? "";

  return (
    <Page title="Inställningar">
      <Card>
        <Text as="p" variant="bodyMd">
          Registrera/uppdatera Blixt som fraktbärare i din butik.
        </Text>

        <div style={{ marginTop: 12 }}>
          <Button url="/api/register-carrier" variant="primary">
            Aktivera frakt
          </Button>
        </div>

        {ok && (
          <div style={{ marginTop: 12 }}>
            <Text as="p" variant="bodyMd">✅ Carrier Service registrerad!</Text>
          </div>
        )}
        {fail && (
          <div style={{ marginTop: 12 }}>
            <Text as="p" variant="bodyMd">❌ {msg || "Kunde inte registrera."}</Text>
          </div>
        )}
      </Card>
    </Page>
  );
}

// app/routes/_index.tsx
import type { HeadersFunction } from "@remix-run/node";
import { Page, Layout, Card, Text, Button, InlineStack } from "@shopify/polaris";

export const headers: HeadersFunction = () => ({
  // Gör att sidan får bäddas in i Shopify admin
  "Content-Security-Policy":
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com;",
});

export default function AppHome() {
  return (
    <Page title="Blixt Delivery">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Välkommen 👋</Text>
            <Text as="p" variant="bodyMd">
              Här kopplar du din butik till Blixt och bokar leveranser.
            </Text>

            {/* Använd vanlig div för margin (Polaris-komponenter saknar style-prop) */}
            <div style={{ marginTop: 12 }}>
              <InlineStack gap="300" align="start" blockAlign="center">
                <Button url="/settings" variant="secondary">Inställningar</Button>
                <Button url="/orders" variant="primary">Boka leverans</Button>
              </InlineStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

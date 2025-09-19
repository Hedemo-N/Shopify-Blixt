import type { HeadersFunction } from "@remix-run/node";
import { Page, Layout, Card, Text, Button, InlineStack } from "@shopify/polaris";


export const headers: HeadersFunction = () => ({
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

            <InlineStack gap="300" align="start" blockAlign="center" style={{ marginTop: 12 }}>
              <Button url="/app/settings" variant="secondary">
                Inställningar
              </Button>
              <Button url="/app/orders" variant="primary">
                Boka leverans
              </Button>
            </InlineStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

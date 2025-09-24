// app/routes/_index.tsx
import type { HeadersFunction } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack, // ⬅️ lägg till
} from "@shopify/polaris";

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
            {/* BlockStack ger vertikal spacing mellan block */}
            <BlockStack gap="300">
              <div>
                <Text as="h2" variant="headingMd">Välkommen 👋</Text>
                <Text as="p" variant="bodyMd">
                  Här kopplar du din butik till Blixt och bokar leveranser.
                </Text>
              </div>

              <InlineStack gap="300" align="start" blockAlign="center">
                <Button url="/settings" variant="secondary">
                  Inställningar
                </Button>
                <Button url="/orders" variant="primary">
                  Boka leverans
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

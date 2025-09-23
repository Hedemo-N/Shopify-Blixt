import type { HeadersFunction } from "@remix-run/node";
import { Page, Layout, Card, Text } from "@shopify/polaris";

export const headers: HeadersFunction = () => ({
  "Content-Security-Policy":
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com;",
});

export default function Settings() {
  return (
    <Page title="Inställningar">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Inställningar</Text>
            <Text as="p" variant="bodyMd">
              Här kommer dina Blixt-inställningar ligga. (Placeholder)
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

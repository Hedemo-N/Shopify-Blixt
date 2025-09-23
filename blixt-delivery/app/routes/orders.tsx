import type { HeadersFunction } from "@remix-run/node";
import { Page, Layout, Card, Text } from "@shopify/polaris";

export const headers: HeadersFunction = () => ({
  "Content-Security-Policy":
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com;",
});

export default function Orders() {
  return (
    <Page title="Boka leverans">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Boka leverans</Text>
            <Text as="p" variant="bodyMd">
              Här bygger vi bokningsflödet. (Placeholder)
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export async function createShopifyFulfillment({
    shop,
    shopifyOrderId,
    accessToken,
    trackingUrl,
    trackingNumber,
    courierName,
    lineItems,      // [{id, quantity}]
    locationId     // <-- Skicka med!
  }: {
    shop: string;
    shopifyOrderId: string;
    accessToken: string;
    trackingUrl: string;
    trackingNumber: string;
    courierName: string;
    lineItems: {id: number, quantity: number}[];
    locationId?: number; // Inte alltid men oftast krävs det!
  }) {
    try {
      const endpoint = `https://${shop}/admin/api/2023-10/orders/${shopifyOrderId}/fulfillments.json`;
      const fulfillmentData: any = {
        fulfillment: {
          tracking_url: trackingUrl,
          tracking_number: trackingNumber,
          tracking_company: courierName,
          notify_customer: true,
          line_items: lineItems
        }
      };
      if (locationId) fulfillmentData.fulfillment.location_id = locationId;
  
      console.log("⬆️ Fulfillment-payload till Shopify:", JSON.stringify(fulfillmentData, null, 2));
  
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fulfillmentData)
      });
  
      const body = await response.text();
      console.log(`📥 Shopify svar: status=${response.status} body=${body}`);
      if (!response.ok) {
        throw new Error(`Shopify-fulfillment FEL! Status: ${response.status} StatusText: ${response.statusText} Body: ${body}`);
      }
      const resJson = body ? JSON.parse(body) : {};
      console.log("✅ Fulfillment skapad i Shopify:", resJson);
      return resJson;
    } catch (err) {
      console.error("❌ Kunde inte skapa fulfillment:", err);
      return null;
    }
  }
  
import { LoaderFunction, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const CREATE_CARRIER_SERVICE = `
mutation carrierServiceCreate($carrierService: CarrierServiceInput!) {
  carrierServiceCreate(carrierService: $carrierService) {
    userErrors {
      field
      message
    }
    carrierService {
      id
      name
      callbackUrl
    }
  }
}
`;

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const variables = {
      carrierService: {
        name: "Blixt Delivery",
        callbackUrl: "https://3026-213-89-195-158.ngrok-free.app/api/shipping-rates",
        serviceDiscovery: true,
        format: "json"
      }
    };

    // TS kan bråka här, så vi "tvingar" det rätt:
    // @ts-ignore
    const response = await admin.graphql(
      CREATE_CARRIER_SERVICE,
      variables as any
    );

    const result = await response.json?.() ?? response;

    console.log("✅ Registrering lyckades:", result);
    return json({ success: true, result });
  } catch (error: any) {
    console.error("❌ Fel vid registrering:", error);
    return json({ success: false, error: error.message || error.toString() }, { status: 500 });
  }
};

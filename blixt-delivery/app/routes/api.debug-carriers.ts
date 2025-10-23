// app/routes/api.debug-carriers.ts
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Kräver att du öppnar från Admin (så sessionen finns)
  const { admin } = await authenticate.admin(request);

  const QUERY = `#graphql
    {
      carrierServices(first: 10) {
        edges {
          node {
            id
            name
            callbackUrl
            active
          }
        }
      }
    }
  `;

  // @ts-ignore – admin.graphql returnerar Response
  const resp = await admin.graphql(QUERY);
  const data = (await resp.json?.()) ?? (await resp.json());
  return json(data);
}

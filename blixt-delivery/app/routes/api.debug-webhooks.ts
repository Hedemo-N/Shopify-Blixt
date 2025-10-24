import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const Q = `#graphql
query {
  webhookSubscriptions(first: 50) {
    edges {
      node {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint { callbackUrl }
        }
      }
    }
  }
}
`;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request); // körs i admin-iframe
  const resp = await admin.graphql(Q);
  const data = await resp.json?.() ?? resp;
  return json(data);
}

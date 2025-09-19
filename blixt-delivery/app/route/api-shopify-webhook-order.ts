// app/routes/webhooks.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // relativ import

export async function loader() {
  return new Response("OK");
}

export async function action({ request }: ActionFunctionArgs) {
  // Verifierar HMAC + dispatchar till callbacks du definierat i shopify.server.ts
  await authenticate.webhook(request);
  return new Response(); // 200 OK
}

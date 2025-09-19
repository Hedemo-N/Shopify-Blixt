import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader() {
  return new Response("OK");
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.webhook(request); // verifierar + dispatchar till dina callbacks
  return new Response(); // 200
}

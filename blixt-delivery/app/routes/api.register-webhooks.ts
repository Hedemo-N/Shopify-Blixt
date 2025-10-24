import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, registerWebhooks } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request); // körs i admin-iframe
  const results = await registerWebhooks({ session });   // registrerar enligt shopify.server.ts
  return json({ ok: true, results });
}

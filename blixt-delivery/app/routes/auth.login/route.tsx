// app/routes/auth.login/route.tsx
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { login } from "../../shopify.server";

// ⬇️ Viktigt: /auth/login ska bara köra login()
export async function loader({ request }: LoaderFunctionArgs) {
  return login(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return login(request);
}

// Inget UI här
export default function AuthLogin() {
  return null;
}

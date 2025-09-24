// app/root.tsx
import type { LoaderFunctionArgs, HeadersFunction, LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "./shopify.server";

// app/root.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Släpp igenom auth-flödet
  if (url.pathname === "/auth/login" || url.pathname.startsWith("/auth/")) {
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  }

  // 🔓 Låt API/webhooks gå utan admin-auth (annars redirectas du till /auth/login)
  if (url.pathname.startsWith("/api/") || url.pathname === "/webhooks") {
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  }

  // Allt annat säkras
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}


export default function Root() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <html lang="sv">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider isEmbeddedApp apiKey={apiKey}>
          <NavMenu>
            <a href="/" rel="home">Home</a>
            <a href="/orders">Boka leverans</a>
            <a href="/settings">Inställningar</a>
            <a href="/api/register-carrier">Aktivera frakt</a>
          </NavMenu>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers: HeadersFunction = (args) => boundary.headers(args);

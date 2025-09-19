// app/root.tsx
import type {
  LinksFunction,
  LoaderFunctionArgs,
  HeadersFunction,
} from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "./shopify.server";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://cdn.shopify.com/" },
  { rel: "stylesheet", href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css" },
  { rel: "stylesheet", href: polarisStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  // Säkrar inbäddning + session i admin
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
        {/* Global Polaris/App Bridge wrapper för hela appen */}
        <AppProvider isEmbeddedApp apiKey={apiKey}>
          <NavMenu>
            <a href="/" rel="home">Home</a>
            <a href="/orders">Boka leverans</a>
            <a href="/settings">Inställningar</a>
            <a href="/additional">Additional page</a>
          </NavMenu>

          {/* Här renderas dina sidor */}
          <Outlet />
        </AppProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Shopify behöver dessa för att bubbla upp rätt headers
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers: HeadersFunction = (args) => boundary.headers(args);

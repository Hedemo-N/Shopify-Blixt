// app/routes.ts
// @ts-nocheck
// Den här appen använder array-baserad route-konfig.

export default [
  // Startsidan – du sa att din fil heter app._index.tsx
  { path: "/", file: "routes/app._index.tsx" },

  // /app – alias/fallback (redirect-fil)
  { path: "/app", file: "routes/app.tsx" },

  // Webhook-endpoint (måste matcha callbackUrl i shopify.server.ts)
  { path: "/webhooks", file: "routes/webhooks.tsx" },

  // (Valfritt – lägg till när du skapar sidorna)
  // { path: "/orders", file: "routes/orders.tsx" },
  // { path: "/settings", file: "routes/settings.tsx" },
  // { path: "/additional", file: "routes/app.additional.tsx" },
];

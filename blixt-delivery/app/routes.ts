// app/routes.ts
// @ts-nocheck
export default [
  // 🏠 Startsida – du har app._index.tsx i app/routes/
  { path: "/", file: "routes/app._index.tsx" },

  // 🔁 Alias för /app (redirect-komponenten i app/routes/app.tsx)
  { path: "/app", file: "routes/app.tsx" },

  // 🔔 Webhooks (GET: OK, POST: Shopify events)
  { path: "/webhooks", file: "routes/webhooks.tsx" },

  // 🔑 Auth-flödet
  { path: "/auth/*", file: "routes/auth.$.tsx" },
  { path: "/auth/login", file: "routes/auth.login/route.tsx" },

  // 🚚 Carrier Service & Rates (KRITISKT för checkout)
  { path: "/api/register-carrier", file: "routes/api.register-carrier.ts" },
  { path: "/api/shipping-rates", file: "routes/api.shipping-rates.ts" },

  // (Valfritt – om du har dem)
  // { path: "/additional", file: "routes/app.additional.tsx" },
  // { path: "/orders", file: "routes/orders.tsx" },
  // { path: "/settings", file: "routes/settings.tsx" },
];

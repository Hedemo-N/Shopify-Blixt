// app/routes.ts
export default [
  { path: "/", file: "routes/_index.tsx" },
  { path: "/app", file: "routes/app.tsx" },
  { path: "/webhooks", file: "routes/webhooks.tsx" },
  { path: "/auth/*", file: "routes/auth.$.tsx" },
  { path: "/auth/login", file: "routes/auth.login/route.tsx" },
  { path: "/api/register-carrier", file: "routes/api.register-carrier.ts" },
  { path: "/api/shipping-rates", file: "routes/api.shipping-rates.ts" },
  { path: "/settings", file: "routes/settings.tsx" },
  { path: "/orders",   file: "routes/orders.tsx" },
];

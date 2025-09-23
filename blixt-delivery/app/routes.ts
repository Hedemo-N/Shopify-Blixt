// app/routes.ts
// @ts-nocheck
export default function (defineRoutes) {
  return defineRoutes((route) => {
    // 👇 Start / ska rendera din app._index.tsx
    route("/", "routes/app._index.tsx");

    // 👇 /app => redirect (om du har app/routes/app.tsx som redirect)
    route("/app", "routes/app.tsx");

    // Webhooks (måste finnas om callbackUrl = "/webhooks")
    route("/webhooks", "routes/webhooks.tsx");

    // Valfritt: om du har en extra sida
    // route("/additional", "routes/app.additional.tsx");
  });
}

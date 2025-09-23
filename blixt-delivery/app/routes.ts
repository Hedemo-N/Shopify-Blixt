// app/routes.ts
// @ts-nocheck
export default [
  { path: "/", file: "routes/app._index.tsx" },
  { path: "/app", file: "routes/app.tsx" },
  { path: "/webhooks", file: "routes/webhooks.tsx" },

  // 🔑 AUTH – NYTT
  { path: "/auth/*", file: "routes/auth.$.tsx" },
  { path: "/auth/login", file: "routes/auth.login/route.tsx" },
];

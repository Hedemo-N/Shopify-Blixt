// api/index.ts
import { createRequestHandler } from "@remix-run/vercel";

// NOTE: Remix genererar denna fil vid build.
// @ts-expect-error: generated at build time by `remix vite:build`
import * as build from "../build/server/index.js";

export default createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});

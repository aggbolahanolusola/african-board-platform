// Vercel build using the Build Output API (https://vercel.com/docs/build-output-api/v3).
//
// Why: package.json has "type": "module", so Vercel's zero-config Node builder
// transpiles each server file individually and cannot resolve extensionless
// relative imports (e.g. ../server/_core/app) at runtime. We instead bundle the
// Express app into one self-contained function ourselves with esbuild.
//
// Produces:
//   .vercel/output/static/**                      <- built client (served directly)
//   .vercel/output/functions/index.func/index.mjs <- bundled Express app
//   .vercel/output/functions/index.func/index.html <- SPA fallback shell
//   .vercel/output/functions/index.func/.vc-config.json
//   .vercel/output/config.json                    <- routing
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync, rmSync } from "node:fs";

const OUT = ".vercel/output";
const FUNC = `${OUT}/functions/index.func`;

rmSync(OUT, { recursive: true, force: true });

console.log("[vercel-build] Building client with Vite...");
execSync("node_modules/.bin/vite build", { stdio: "inherit" });

console.log("[vercel-build] Copying static assets...");
mkdirSync(`${OUT}/static`, { recursive: true });
cpSync("dist/public", `${OUT}/static`, { recursive: true });

console.log("[vercel-build] Bundling serverless function...");
mkdirSync(FUNC, { recursive: true });
await build({
  entryPoints: ["server/_core/serverless-entry.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${FUNC}/index.mjs`,
  // Shim require() for the few CommonJS deps that use it under ESM output.
  banner: {
    js: "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);",
  },
});

// SPA shell lives next to the bundle so the function can serve client routes.
cpSync("dist/public/index.html", `${FUNC}/index.html`);

writeFileSync(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    },
    null,
    2
  )
);

writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Serve real static files first (assets, logo, etc.).
        { handle: "filesystem" },
        // Everything else (/, /api/*, client routes) goes to the Express function.
        // The function lives at functions/index.func, so its route is "/index";
        // Vercel passes the original request path through to it.
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("[vercel-build] Build Output API ready at .vercel/output");

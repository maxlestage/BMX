// bmx — serveur de développement (Bun)
// Sert l'app avec bundling à la volée + recharge. `bun run dev`.

import { existsSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = "./public";

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);

    // Bundle de l'entrée React à la volée.
    if (path === "/assets/main.js") {
      const built = await Bun.build({
        entrypoints: ["./src/main.tsx"],
        target: "browser",
        sourcemap: "inline",
        define: {
          "process.env.BMX_API_URL": JSON.stringify(
            process.env.BMX_API_URL ?? "http://localhost:8080/api/v1",
          ),
        },
      });
      if (!built.success) {
        return new Response(built.logs.join("\n"), { status: 500 });
      }
      return new Response(built.outputs[0], {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Fichiers statiques de public/ (sw.js, manifest, icônes…).
    if (path !== "/" && existsSync(join(PUBLIC_DIR, path))) {
      return new Response(Bun.file(join(PUBLIC_DIR, path)));
    }

    // SPA fallback → index de dev.
    return new Response(DEV_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

const DEV_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#17191c" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="manifest" href="/site.webmanifest" />
    <title>bmx — dev</title>
    <style>html,body{margin:0;background:#17191c;color:#ededec}#root{min-height:100vh}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>`;

console.log(`\n🚲 bmx dev → http://localhost:${server.port}\n`);

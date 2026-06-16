// bmx — build de production (Bun)
// Bundle src/main.tsx → dist/, génère index.html avec assets fingerprintés,
// puis recopie public/ (PWA: sw.js, manifest, offline.html, icônes…).

import { writeFileSync, readdirSync, existsSync, copyFileSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "./dist";
const PUBLIC_DIR = "./public";

// Repartir d'un dossier propre (pas de fichier haché périmé).
rmSync(OUT_DIR, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/main.tsx"],
  outdir: OUT_DIR,
  target: "browser",
  minify: true,
  sourcemap: "linked",
  // Découpe les imports dynamiques (ex. la scène 3D Three.js) en chunks à part,
  // chargés à la demande → bundle initial léger.
  splitting: true,
  // Tout est émis à la racine de dist/ avec un préfixe relatif "./". Modules
  // (imports de chunks) et document partagent ainsi la même base → fonctionne à
  // la racine comme sous le sous-chemin GitHub Pages (/BMX/).
  publicPath: "./",
  naming: {
    entry: "[name]-[hash].[ext]",
    asset: "[name]-[hash].[ext]",
    chunk: "[name]-[hash].[ext]",
  },
  // URL de l'API injectée au build (ex. https://<app>.herokuapp.com/api/v1).
  // Définir la variable BMX_API_URL dans l'environnement CI/Pages.
  define: {
    "process.env.BMX_API_URL": JSON.stringify(process.env.BMX_API_URL ?? ""),
  },
});

if (!process.env.BMX_API_URL) {
  console.warn(
    "⚠ BMX_API_URL non défini — le front retombera sur http://localhost:8080/api/v1",
  );
}

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const jsOut = result.outputs.find((o) => o.kind === "entry-point" && o.path.endsWith(".js"));
const cssOut = result.outputs.find((o) => o.path.endsWith(".css"));

const jsName = jsOut?.path.split("/").pop() ?? "";
const cssName = cssOut?.path.split("/").pop() ?? "";

writeFileSync(
  join(OUT_DIR, "index.html"),
  `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <link rel="manifest" href="site.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#17191c" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="bmx" />

    <title>bmx — Le bmx, c'est pour toujours 🚲</title>
    <meta name="description" content="bmx riders company. Une lettre d'amour au bmx : la liberté, la chute, la communauté, le grain du bitume. Roule avec nous." />
    <meta name="keywords" content="bmx, BMX, BMX bike, ride, street, park, bowl, bunny hop, culture bmx" />
    <meta name="author" content="bmx riders company" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://bmx.bike/" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="bmx" />
    <meta property="og:title" content="bmx — Le bmx, c'est pour toujours 🚲" />
    <meta property="og:description" content="Une lettre d'amour au bmx. La liberté, la chute, la communauté, le grain du bitume." />
    <meta property="og:url" content="https://bmx.bike/" />
    <meta property="og:image" content="https://bmx.bike/icon-512.png" />
    <meta property="og:locale" content="fr_FR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="bmx — Le bmx, c'est pour toujours 🚲" />
    <meta name="twitter:description" content="Une lettre d'amour au bmx. La liberté, la chute, la communauté." />
    <meta name="twitter:image" content="https://bmx.bike/icon-512.png" />

    <style>
      html,body{margin:0;padding:0;background:#17191c;color:#ededec;-webkit-font-smoothing:antialiased}
      body{min-height:100vh}
      #root{min-height:100vh}
    </style>

    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Organization","name":"bmx riders company","url":"https://bmx.bike/","description":"Une lettre d'amour au bmx.","slogan":"Le bmx, c'est pour toujours."}
    </script>
${cssName ? `    <link rel="preload" as="style" href="${cssName}" />\n    <link rel="stylesheet" crossorigin href="${cssName}">\n` : ""}    <link rel="modulepreload" crossorigin href="${jsName}" />
    <script type="module" crossorigin src="${jsName}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
);

// Recopier les fichiers statiques de public/ → dist/
if (existsSync(PUBLIC_DIR)) {
  for (const file of readdirSync(PUBLIC_DIR)) {
    const src = join(PUBLIC_DIR, file);
    if (statSync(src).isFile()) {
      copyFileSync(src, join(OUT_DIR, file));
    }
  }
}

console.log(`\n✓ Build bmx — Bun ${Bun.version}`);
for (const out of result.outputs) {
  const kb = (out.size / 1024).toFixed(1);
  console.log(`  ${out.path.split("/").pop()} — ${kb} kB`);
}

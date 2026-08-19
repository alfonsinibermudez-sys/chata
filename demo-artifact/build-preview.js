// Combines index.html + css/styles.css + js/storage.js + js/app.js + demo seed
// into a single self-contained preview.html for publishing as an Artifact.
const fs = require("fs");
const path = require("path");

const root = __dirname;
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "styles.css"), "utf8");
const storageJs = fs.readFileSync(path.join(root, "js", "storage.js"), "utf8");
const appJs = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
const seedJs = fs.readFileSync(path.join(root, "js", "demo-seed.js"), "utf8");

const bodyMatch = indexHtml.match(/<body>([\s\S]*)<\/body>/);
let body = bodyMatch[1];
// strip the external script tags, we inline everything instead
body = body.replace(/<script src="js\/storage\.js"><\/script>\s*/, "");
body = body.replace(/<script src="js\/app\.js"><\/script>\s*/, "");

const out = `<title>Remisiones Chatarrería</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${css}
.demo-note {
  position: fixed; bottom: 14px; right: 16px;
  background: var(--surface); border: 1px solid var(--line); color: var(--ink-muted);
  font-size: 11.5px; padding: 7px 12px; border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  font-family: var(--font-body);
}
</style>
${body}
<div class="demo-note">Demo — los datos se guardan solo en tu navegador</div>

<script>
${storageJs}

${seedJs}

${appJs}
</script>
`;

fs.writeFileSync(path.join(root, "preview.html"), out, "utf8");
console.log("preview.html written, " + out.length + " bytes");

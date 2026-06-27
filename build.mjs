import { readdirSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const pluginsDir = "plugins";
const outDir = "dist";

for (const name of readdirSync(pluginsDir)) {
  const pluginPath = join(pluginsDir, name);
  const entry = join(pluginPath, "src", "index.js");
  const manifestSrc = join(pluginPath, "manifest.json");
  const outPath = join(outDir, name);

  if (!existsSync(entry)) continue;

  mkdirSync(outPath, { recursive: true });
  copyFileSync(entry, join(outPath, "index.js"));

  const jsContent = readFileSync(join(outPath, "index.js"));
  const hash = createHash("sha256").update(jsContent).digest("hex");

  const manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
  manifest.id ??= name;
  manifest.version ??= "1.0.0";
  manifest.hash = hash;

  writeFileSync(join(outPath, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Copied ${name} -> ${outPath} (hash ${hash.slice(0, 12)}...)`);
}

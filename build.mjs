import { build } from "esbuild";
import { readdirSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const pluginsDir = "plugins";
const outDir = "dist";
const externals = ["@vendetta/*", "react", "react-native"];

for (const name of readdirSync(pluginsDir)) {
  const pluginPath = join(pluginsDir, name);
  const entry = join(pluginPath, "src", "index.tsx");
  const manifestSrc = join(pluginPath, "manifest.json");
  const outPath = join(outDir, name);

  if (!existsSync(entry)) continue;

  mkdirSync(outPath, { recursive: true });

  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: join(outPath, "index.js"),
    format: "cjs",
    target: "esnext",
    jsx: "automatic",
    external: externals,
    minify: true,
  });

  const jsContent = readFileSync(join(outPath, "index.js"));
  const hash = createHash("sha256").update(jsContent).digest("hex");

  const manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
  manifest.id ??= name;
  manifest.version ??= "1.0.0";
  manifest.hash = hash;

  writeFileSync(join(outPath, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Built ${name} -> ${outPath} (hash ${hash.slice(0, 12)}...)`);
}

import { build } from "esbuild";
import { readdirSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { join } from "path";

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
    format: "esm",
    target: "esnext",
    jsx: "automatic",
    external: externals,
    minify: true,
  });

  copyFileSync(manifestSrc, join(outPath, "manifest.json"));
  console.log(`Built ${name} -> ${outPath}`);
}

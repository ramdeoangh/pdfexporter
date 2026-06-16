import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";
import * as path from "path";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  logLevel: "info",
};

const ctx = await esbuild.context({
  ...shared,
  entryPoints: ["src/extension.ts", "src/exportCli.ts"],
  outdir: "package/dist",
  external: ["vscode"],
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}

mkdirSync("package/assets/img", { recursive: true });
cpSync("src/img", "package/assets/img", { recursive: true });

const vendorAssets = [
  [
    "node_modules/github-markdown-css/github-markdown.css",
    "package/assets/vendor/github-markdown.css",
  ],
  [
    "node_modules/highlight.js/styles/github.css",
    "package/assets/vendor/highlight-github.css",
  ],
  [
    "node_modules/mermaid/dist/mermaid.min.js",
    "package/assets/vendor/mermaid.min.js",
  ],
];

for (const [source, destination] of vendorAssets) {
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination);
}

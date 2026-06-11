import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";

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

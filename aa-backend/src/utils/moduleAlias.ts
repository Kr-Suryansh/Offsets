/**
 * Register tsconfig path aliases at runtime (for compiled JS).
 * Import this as the very first line in server.ts when running compiled output.
 *
 * For ts-node-dev, tsconfig-paths handles this automatically via tsconfig.json.
 */
import path from "path";
import moduleAlias from "module-alias";

moduleAlias.addAliases({
  "@modules": path.join(__dirname, "../modules"),
  "@infra": path.join(__dirname, "../infra"),
  "@config": path.join(__dirname, "../config"),
  "@types": path.join(__dirname, "../types"),
  "@utils": path.join(__dirname, "../utils"),
});

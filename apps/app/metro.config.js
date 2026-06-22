// Metro-Config für das pnpm-Monorepo: Workspace-Wurzel beobachten und die
// @hofino-TS-Pakete (Quell-Imports mit .js-Endung) korrekt auflösen.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// "exports"-Feld der Pakete nutzen (zeigt auf die TS-Quellen unter src/).
config.resolver.unstable_enablePackageExports = true;

// App und Pakete importieren intern mit .js-Endung (Bundler-Konvention), die Dateien
// sind aber .ts/.tsx. Für relative Imports aus eigenem Code zuerst .tsx/.ts versuchen.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath || "";
  const ours = origin !== "" && !origin.includes("node_modules");
  if (ours && moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    for (const ext of [".tsx", ".ts"]) {
      try {
        return context.resolveRequest(context, moduleName.replace(/\.js$/, ext), platform);
      } catch {
        // nächste Endung / Original versuchen
      }
    }
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;

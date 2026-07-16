const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) =>
  context.resolveRequest(
    context,
    moduleName.startsWith("three") ? "three/webgpu" : moduleName,
    platform,
  );

module.exports = config;

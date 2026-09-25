const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const mapsWebStub = path.resolve(projectRoot, 'src/stubs/react-native-maps.web.tsx');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: mapsWebStub };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.alias = {
  ...(config.resolver.alias ?? {}),
  '@mobile': path.resolve(projectRoot, 'src'),
  '@react-native-async-storage/async-storage': path.resolve(
    workspaceRoot,
    'node_modules/@react-native-async-storage/async-storage'
  ),
  '@react-native-community/datetimepicker': path.resolve(
    workspaceRoot,
    'node_modules/@react-native-community/datetimepicker'
  ),
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
};

module.exports = withNativeWind(config, { input: './global.css' });

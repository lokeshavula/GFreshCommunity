const path = require('path');
const { withNativeWind } = require('nativewind/metro');

// When building or bundling for iOS/Android, use @react-native/metro-config.
// When running Expo Web, use expo/metro-config for web CSS support.
function getBaseConfig() {
  const isWeb = process.argv.some(arg => arg.includes('web')) || process.env.EXPO_WEB === '1';
  if (isWeb) {
    try {
      const { getDefaultConfig } = require('expo/metro-config');
      return getDefaultConfig(__dirname);
    } catch {
      // fallback
    }
  }
  const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
  return mergeConfig(getDefaultConfig(__dirname), {});
}

const config = getBaseConfig();

module.exports = withNativeWind(config, {
  input: path.resolve(__dirname, 'global.css'),
  configPath: path.resolve(__dirname, 'tailwind.config.js'),
});

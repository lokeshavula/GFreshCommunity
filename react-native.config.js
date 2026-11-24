/**
 * Icon fonts are bundled on Android via fonts.gradle in android/app/build.gradle.
 * iOS uses UIAppFonts in Info.plist (Ionicons.ttf).
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        ios: null,
      },
    },
  },
  assets: [],
};

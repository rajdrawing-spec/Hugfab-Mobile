// Metro, with NativeWind's CSS transform wired in. `input` is the stylesheet
// that carries the Tailwind directives; everything else is Expo's default.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });

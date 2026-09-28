/**
 * NativeWind's preset wraps babel-preset-expo; `jsxImportSource` is what lets a
 * `className` on a React Native view mean anything.
 *
 * react-native-worklets/plugin must stay LAST — Reanimated 4 moved its plugin
 * there, and a plugin ordered after it does not see the worklets it produces.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-worklets/plugin'],
  };
};

const { expo } = require("./app.json");
const palette = require("./theme.json");

module.exports = {
  ...expo,
  android: {
    ...expo.android,
    adaptiveIcon: {
      ...expo.android.adaptiveIcon,
      backgroundColor: palette.native.adaptiveIconBackground,
    },
  },
  plugins: expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-splash-screen") {
      return [
        plugin[0],
        {
          ...plugin[1],
          backgroundColor: palette.native.splashBackground,
          dark: {
            ...plugin[1].dark,
            backgroundColor: palette.native.darkSplashBackground,
          },
        },
      ];
    }
    return plugin;
  }).concat("expo-localization"),
};

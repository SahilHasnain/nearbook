/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: "#eef7f3",
          100: "#d9eee6",
          200: "#b5ddce",
          300: "#82c3ab",
          600: "#0a7057",
          700: "#075B46",
          800: "#123D32",
          900: "#0c2e26",
        },
        amber: {
          50: "#FFF8E8",
          100: "#fbf0d7",
          200: "#ead9b1",
          300: "#d8bb7c",
          600: "#d4a24c",
          700: "#075B46",
          800: "#123D32",
          900: "#0c2e26",
        },
        slate: {
          50: "#FFF8E8",
          100: "#fbf0d7",
          200: "#ead9b1",
          300: "#d8c99f",
          400: "#8b8375",
          500: "#665f52",
          600: "#355d50",
          700: "#244c3f",
          800: "#123D32",
          900: "#123D32",
        },
      },
    },
  },
  plugins: [],
};

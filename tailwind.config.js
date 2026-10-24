/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        amber: {
          50: "#fcfaf5",
          100: "#f4efe4",
          200: "#eae1d0",
          300: "#d8c7a7",
          600: "#d4a24c",
          700: "#a4772f",
          800: "#78531f",
          900: "#4f381b",
        },
        slate: {
          50: "#fcfaf5",
          100: "#f4efe4",
          200: "#eae1d0",
          300: "#d8d0c2",
          400: "#8b8375",
          500: "#665f52",
          600: "#4b453b",
          700: "#393329",
          800: "#2b2418",
          900: "#17130b",
        },
      },
    },
  },
  plugins: [],
};

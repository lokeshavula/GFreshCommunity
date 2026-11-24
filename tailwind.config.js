/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A5C3E",
          dark: "#063D29",
          light: "#1A8F5C",
        },
        accent: {
          DEFAULT: "#B8F04A",
          muted: "#8BC34A",
        },
      },
    },
  },
};


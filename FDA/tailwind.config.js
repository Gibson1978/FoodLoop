import colors from "tailwindcss/colors";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /(bg|text|border)-(red|blue|green|yellow|purple|gray)-(100|200|300|400|500|600)/ },
  ],
  theme: {
    extend: {
      colors: {
        ...colors, // ensures red-100 exists
      },
    },
  },
  plugins: [],
}

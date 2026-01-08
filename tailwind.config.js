/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  important: true, // Add this to increase specificity
  theme: {
    extend: {},
  },
  plugins: [],
}

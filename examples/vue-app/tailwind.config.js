module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        dropdown: "url('/src/assets/down.svg')",
      },
    },
  },
  plugins: [],
}

import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // React Compiler (React 19 native): babel preset wires babel-plugin-react-compiler
  // through @rolldown/plugin-babel so portfolio components auto-memoize.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  root: 'src',
  publicDir: false,
  build: {
    outDir: '../',
    emptyOutDir: false,
  },
})

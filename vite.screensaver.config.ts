// One self-contained HTML file of the app, for the Mac screensaver: it opens
// from disk, so everything (scripts, styles, map data) is inside it.
//
//   npm run build:screensaver
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { shared } from './vite.config.ts'

export default mergeConfig(
  shared,
  defineConfig({
    plugins: [viteSingleFile()],
    // Relative, so nothing points at the root of the disk
    base: './',
    resolve: {
      // The screensaver shows no text, so it can do without the fonts
      alias: [{ find: /^@fontsource-variable\/.*/, replacement: fileURLToPath(new URL('./scripts/no-fonts.css', import.meta.url)) }],
    },
    build: { outDir: 'screensaver', emptyOutDir: true },
  }),
)

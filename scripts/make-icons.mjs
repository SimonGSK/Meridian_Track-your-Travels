// The app's icons as PNGs, drawn from public/icon.svg, for phones and app
// stores that want those sizes (and Apple's home screen icon).
//
//   npm run data:icons
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
const SIZES = [
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  ['icons/apple-touch-icon.png', 180],
]

const browser = await chromium.launch()
for (const [file, size] of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: fileURLToPath(new URL(`../public/${file}`, import.meta.url)) })
  await page.close()
  console.log(`Drew ${file} (${size}×${size})`)
}
await browser.close()

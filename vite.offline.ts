import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { serviceWorkerSource } from './src/pwa/serviceWorker.ts'

const SERVICE_WORKER = 'sw.js'

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? filesIn(join(dir, entry.name)) : Promise.resolve([join(dir, entry.name)]))),
  )
  return nested.flat()
}

/**
 * Writes the service worker into the build, listing every file in it and
 * named for their contents, so a new build is a new version.
 */
export function offline(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'meridian-offline',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async closeBundle() {
      const outDir = config.build.outDir
      const paths = (await filesIn(outDir)).filter((path) => relative(outDir, path) !== SERVICE_WORKER).sort()
      const hash = createHash('sha256')
      for (const path of paths) hash.update(relative(outDir, path)).update(await readFile(path))
      const files = paths.map((path) => `./${relative(outDir, path).split(sep).join('/')}`)
      await writeFile(join(outDir, SERVICE_WORKER), serviceWorkerSource(files, hash.digest('hex').slice(0, 12)))
      config.logger.info(`Offline: ${files.length} files kept by ${SERVICE_WORKER}`)
    },
  }
}

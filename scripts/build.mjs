// Writes dist/themes.json, the single file PhLynx fetches from jsDelivr.
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildIndex, loadThemes } from './lib.mjs'

const { themes, problems } = loadThemes('themes')
if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'))
  process.exit(1)
}
mkdirSync('dist', { recursive: true })
writeFileSync('dist/themes.json', buildIndex(themes))
console.log(`✓ dist/themes.json written with ${themes.length} theme(s)`)

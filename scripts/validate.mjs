// Validates themes/*.json and checks dist/themes.json is up to date (use --fix-dist to rewrite it).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { buildIndex, loadThemes } from './lib.mjs'

const { themes, problems } = loadThemes('themes')
const expected = buildIndex(themes)
const current = existsSync('dist/themes.json') ? readFileSync('dist/themes.json', 'utf8') : ''

if (current !== expected) {
  if (process.argv.includes('--fix-dist')) {
    mkdirSync('dist', { recursive: true })
    writeFileSync('dist/themes.json', expected)
  } else if (process.argv.includes('--check-dist')) {
    problems.push('dist/themes.json is out of date; run `npm run build`.')
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${themes.length} theme(s) valid`)

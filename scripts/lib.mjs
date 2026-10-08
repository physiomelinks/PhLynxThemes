/**
 * Theme validation, kept in step with PhLynx's src/utils/nodeThemes.js and schema/theme.schema.json.
 * No dependencies, so the workflows need no install step.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const SCHEMA_VERSION = 1
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const KEY = /^[a-z][a-z0-9-]{0,31}$/
const ID = /^[a-z][a-z0-9-]{1,47}$/
const LIMITS = { name: 64, description: 280, author: 64, license: 64, derivedFrom: 64, label: 32, categories: 24 }
const TOP_LEVEL = ['schemaVersion', 'id', 'name', 'description', 'author', 'license', 'derivedFrom', 'categories']
const CATEGORY_FIELDS = ['key', 'label', 'color', 'dark']

const normaliseHex = (value) => {
  let hex = value.slice(1).toLowerCase()
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
  return `#${hex}`
}

/**
 * @param {*} raw
 * @returns {{ theme: Object|null, errors: string[] }} A clean copy with fields in canonical order.
 */
export function validateTheme(raw) {
  const errors = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { theme: null, errors: ['A theme must be a JSON object.'] }

  for (const field of Object.keys(raw)) if (!TOP_LEVEL.includes(field)) errors.push(`Unknown field "${field}".`)
  if (raw.schemaVersion !== SCHEMA_VERSION) errors.push(`"schemaVersion" must be ${SCHEMA_VERSION}.`)
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) {
    errors.push('"id" must start with a letter and use only lower-case letters, digits and hyphens (2-48 characters).')
  }
  if (typeof raw.name !== 'string' || !raw.name.trim()) errors.push('"name" is required.')
  for (const field of ['name', 'description', 'author', 'license', 'derivedFrom']) {
    if (raw[field] === undefined) continue
    if (typeof raw[field] !== 'string') errors.push(`"${field}" must be text.`)
    else if (raw[field].trim().length > LIMITS[field]) errors.push(`"${field}" must be at most ${LIMITS[field]} characters.`)
  }

  const categories = []
  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    errors.push('"categories" must be a non-empty list.')
  } else if (raw.categories.length > LIMITS.categories) {
    errors.push(`A theme can have at most ${LIMITS.categories} categories.`)
  } else {
    const seen = new Set()
    raw.categories.forEach((c, i) => {
      const where = `Category ${i + 1}`
      if (!c || typeof c !== 'object' || Array.isArray(c)) return errors.push(`${where} must be an object.`)
      for (const field of Object.keys(c)) if (!CATEGORY_FIELDS.includes(field)) errors.push(`${where}: unknown field "${field}".`)
      if (typeof c.key !== 'string' || !KEY.test(c.key)) errors.push(`${where}: "key" must start with a letter and use only lower-case letters, digits and hyphens.`)
      else if (seen.has(c.key)) errors.push(`${where}: key "${c.key}" is used more than once.`)
      seen.add(c.key)
      if (typeof c.label !== 'string' || !c.label.trim()) errors.push(`${where}: "label" is required.`)
      else if (c.label.trim().length > LIMITS.label) errors.push(`${where}: "label" must be at most ${LIMITS.label} characters.`)
      if (typeof c.color !== 'string' || !HEX.test(c.color)) errors.push(`${where}: "color" must be a hex colour such as #a1b2c3.`)
      if (c.dark !== undefined && (typeof c.dark !== 'string' || !HEX.test(c.dark))) errors.push(`${where}: "dark" must be a hex colour such as #a1b2c3, or left out.`)
      if (!errors.length) {
        const clean = { key: c.key, label: c.label.trim(), color: normaliseHex(c.color) }
        if (c.dark !== undefined) clean.dark = normaliseHex(c.dark)
        categories.push(clean)
      }
    })
  }

  if (errors.length) return { theme: null, errors }
  const theme = { schemaVersion: SCHEMA_VERSION, id: raw.id, name: raw.name.trim() }
  for (const field of ['description', 'author', 'license', 'derivedFrom']) if (raw[field]?.trim()) theme[field] = raw[field].trim()
  theme.categories = categories
  return { theme, errors }
}

/** WCAG contrast of each fill against PhLynx's node text, for review comments (advisory only). */
export function contrastNotes(theme) {
  const lum = (hex) => {
    const v = normaliseHex(hex).slice(1)
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = parseInt(v.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const notes = []
  for (const c of theme.categories) {
    const light = ratio(c.color, '#334155')
    if (light < 4.5) notes.push(`${c.label}: ${light.toFixed(1)}:1 against text in light mode`)
    if (c.dark) {
      const dark = ratio(c.dark, '#f8fafc')
      if (dark < 4.5) notes.push(`${c.label}: ${dark.toFixed(1)}:1 against text in dark mode`)
    }
  }
  return notes
}

/**
 * Reads and validates every theme in a directory; each file must be named after its id.
 *
 * @param {string} dir
 * @returns {{ themes: Object[], problems: string[] }}
 */
export function loadThemes(dir) {
  const themes = []
  const problems = []
  const ids = new Set()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    let raw
    try {
      raw = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch (e) {
      problems.push(`${file}: not valid JSON (${e.message})`)
      continue
    }
    const { theme, errors } = validateTheme(raw)
    if (!theme) {
      problems.push(...errors.map((error) => `${file}: ${error}`))
      continue
    }
    if (`${theme.id}.json` !== file) problems.push(`${file}: file name must be "${theme.id}.json".`)
    if (ids.has(theme.id)) problems.push(`${file}: duplicate id "${theme.id}".`)
    ids.add(theme.id)
    themes.push(theme)
  }
  return { themes, problems }
}

/** The combined file PhLynx fetches. Deterministic, so an unchanged theme set rebuilds byte-for-byte. */
export function buildIndex(themes) {
  const sorted = [...themes].sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, themes: sorted }, null, 2) + '\n'
}

/**
 * Pulls the theme JSON out of an issue created from the theme-submission form.
 *
 * @param {string} body - The issue body as GitHub renders the form.
 * @returns {{ raw: *, error: string|null }}
 */
export function parseIssueBody(body) {
  const section = /###\s*Theme JSON\s*\n([\s\S]*?)(?=\n###\s|$)/i.exec(body ?? '')
  if (!section) return { raw: null, error: 'Could not find the "Theme JSON" section. Please use the theme submission form.' }
  const text = section[1].trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim()
  if (!text || text === '_No response_') return { raw: null, error: 'The "Theme JSON" section is empty.' }
  try {
    return { raw: JSON.parse(text), error: null }
  } catch (e) {
    return { raw: null, error: `The theme is not valid JSON: ${e.message}` }
  }
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIndex, loadThemes, parseIssueBody, validateTheme } from './lib.mjs'

const theme = {
  schemaVersion: 1,
  id: 'warm',
  name: 'Warm',
  categories: [{ key: 'cell', label: 'Cell', color: '#FA0' }],
}

test('accepts and normalises a valid theme', () => {
  const { theme: clean, errors } = validateTheme(theme)
  assert.deepEqual(errors, [])
  assert.equal(clean.categories[0].color, '#ffaa00')
})

test('rejects unknown fields and non-hex colours', () => {
  assert.equal(validateTheme({ ...theme, css: 'x' }).theme, null)
  assert.equal(validateTheme({ ...theme, categories: [{ key: 'a', label: 'A', color: 'red' }] }).theme, null)
  assert.equal(validateTheme({ ...theme, categories: [{ key: 'a', label: 'A', color: '#fff', extra: 1 }] }).theme, null)
})

test('every published theme is valid and the index is deterministic', () => {
  const { themes, problems } = loadThemes('themes')
  assert.deepEqual(problems, [])
  assert.ok(themes.length > 0)
  assert.equal(buildIndex(themes), buildIndex([...themes].reverse()))
})

test('reads the JSON out of an issue form body', () => {
  const body = `### Theme name\n\nWarm\n\n### Theme JSON\n\n\`\`\`json\n${JSON.stringify(theme, null, 2)}\n\`\`\`\n\n### Licence\n\n- [X] I agree`
  assert.deepEqual(parseIssueBody(body).raw, theme)
  assert.match(parseIssueBody('### Theme JSON\n\n_No response_').error, /empty/)
  assert.match(parseIssueBody('### Theme JSON\n\n```json\n{oops\n```').error, /not valid JSON/)
  assert.match(parseIssueBody('nothing here').error, /Could not find/)
})

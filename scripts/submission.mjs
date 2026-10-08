// Reads a theme submission issue (ISSUE_BODY env var), validates it and reports for the workflow.
//   node scripts/submission.mjs check   -> writes comment.md; exit 1 when invalid
//   node scripts/submission.mjs write   -> also writes themes/<id>.json
// The issue body is untrusted: it is only ever read from the environment and parsed as JSON.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { contrastNotes, parseIssueBody, validateTheme } from './lib.mjs'

const mode = process.argv[2] ?? 'check'
const { raw, error } = parseIssueBody(process.env.ISSUE_BODY)
const lines = []
let ok = false
let theme = null

if (error) {
  lines.push(`❌ ${error}`)
} else {
  const result = validateTheme(raw)
  theme = result.theme
  if (!theme) {
    lines.push('❌ The theme has problems:', '', ...result.errors.map((e) => `- ${e}`))
  } else {
    ok = true
    const path = `themes/${theme.id}.json`
    const exists = existsSync(path)
    const same = exists && JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))) === JSON.stringify(theme)
    lines.push(`✅ **${theme.name}** (\`${theme.id}\`) is valid: ${theme.categories.length} categor${theme.categories.length === 1 ? 'y' : 'ies'}.`)
    lines.push('', '| Key | Label | Colour | Dark |', '| --- | --- | --- | --- |')
    for (const c of theme.categories) lines.push(`| \`${c.key}\` | ${c.label} | \`${c.color}\` | ${c.dark ? `\`${c.dark}\`` : '_auto_'} |`)
    if (exists) {
      lines.push('', same
        ? 'ℹ️ This is identical to the theme already published.'
        : `⚠️ A theme with id \`${theme.id}\` already exists. Accepting this replaces it; maintainers should check that existing category keys are kept, because saved workspaces refer to them.`)
    }
    const notes = contrastNotes(theme)
    if (notes.length) lines.push('', '⚠️ Contrast below WCAG AA (4.5:1), so node text may be hard to read:', ...notes.map((n) => `- ${n}`))
    lines.push('', 'A maintainer can add the `theme: accepted` label to open a pull request.')
    if (mode === 'write') writeFileSync(path, JSON.stringify(theme, null, 2) + '\n')
  }
}

writeFileSync('comment.md', lines.join('\n') + '\n')
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `valid=${ok}\nid=${theme?.id ?? ''}\nname=${(theme?.name ?? '').replace(/[\r\n]/g, ' ')}\n`)
}
console.log(lines.join('\n'))
process.exit(ok ? 0 : 1)

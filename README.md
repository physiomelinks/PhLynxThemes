# PhLynx themes

Shared node colour themes for [PhLynx](https://github.com/physiomelinks/phlynx). PhLynx fetches
`dist/themes.json` from jsDelivr in the background after it loads:

```
https://cdn.jsdelivr.net/gh/physiomelinks/phlynx-themes@1/dist/themes.json
```

`@1` resolves to the newest `v1.x.y` tag, so a future, incompatible schema (v2) never reaches older
PhLynx builds.

## What a theme is

A theme names a set of node categories and gives each a colour. A node stores only the category
**key**, never a colour, so switching theme recolours a workspace and saved workspaces don't depend on
any one theme.

```json
{
  "schemaVersion": 1,
  "id": "domain-types",
  "name": "Domain types",
  "categories": [
    { "key": "membrane", "label": "Membrane", "color": "#ffe2ec", "dark": "#4a2333" }
  ]
}
```

- `key`: what nodes store. Never change or remove a key once it's published.
- `color`: the fill in light mode. Hex only.
- `dark`: optional fill in dark mode. When it's left out, PhLynx mixes `color` into the dark surface.

The full rules are in [`schema/theme.schema.json`](schema/theme.schema.json).
`scripts/lib.mjs` implements the same checks without dependencies. PhLynx's `src/utils/nodeThemes.js`
mirrors them too, so keep all three in step.

## Proposing a theme

1. In PhLynx, open **Properties → My themes**, start from any theme, edit it and save.
2. Click **Propose for everyone**. This opens a pre-filled issue using the
   [theme submission form](.github/ISSUE_TEMPLATE/theme-submission.yml).
3. A workflow validates the JSON and comments with the result, including a contrast check.
4. When a maintainer adds the `theme: accepted` label, a workflow opens a PR that adds
   `themes/<id>.json`.
5. Merging the PR triggers the release workflow. It rebuilds `dist/themes.json`, tags the next
   `v1.x.y` and purges jsDelivr.

You can also open a PR that adds a file to `themes/` directly.

## Development

```sh
npm test                           # unit tests + validate every theme
npm run build                      # write dist/themes.json
node scripts/validate.mjs --check-dist
```

## One-time repository setup

- Create the labels that the form and workflows use:

  ```sh
  gh label create "theme: submission" --color 0e8a16
  gh label create "theme: valid"      --color c2e0c6
  gh label create "theme: invalid"    --color e99695
  gh label create "theme: accepted"   --color 1d76db
  ```

- Under **Settings → Actions → General**:
  - Set **Workflow permissions** to "Read and write".
  - Tick **Allow GitHub Actions to create and approve pull requests**.
- If `main` is protected, either let `github-actions[bot]` push the rebuilt `dist/` or change the
  release workflow to open a PR instead.
- PRs opened with the default `GITHUB_TOKEN` don't trigger CI on their own. A maintainer can push
  an empty commit to start it, or you can switch `create-pull-request` to a GitHub App token.
- Push a first tag (`git tag v1.0.0 && git push --tags`) so `@1` resolves.

## Licence

Themes are released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Submitters agree to this in the issue form.

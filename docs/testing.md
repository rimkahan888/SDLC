# Testing

How this project decides that work is finished. The product checks are the definition of done in [intent.md](../intent.md). This file says which suite proves which kind of check. The blank for a future change is [templates/definition-of-done.md](../templates/definition-of-done.md). The repo's own checklist file arrives with that later docs issue; until it exists, use the list in the intent.

A green run shows the build matched the plan. It does not show the plan was the right product. A person reviews the real build before merge.

## Suites

| Suite | Proves | Docs |
| --- | --- | --- |
| xUnit | The API routes, the status codes, and content validation (a bad stage, template, style, or prompt shell fails). The test project targets `net10.0`. .NET 8 support ends 10 November 2026. | [xUnit v3](https://xunit.net/docs/getting-started/v3/getting-started) |
| Vitest | Pure functions and Vue components: prompt assembly, style-token mapping, copy-text builders, slider clamping, shortcut matching. | [Vitest](https://vitest.dev/guide/) |
| Playwright | The page at 540px and at 1440px. Screenshots of the cheatsheet and of the prompt builder. | [Playwright](https://playwright.dev/docs/intro), [viewports](https://playwright.dev/docs/emulation), [screenshots](https://playwright.dev/docs/screenshots) |

Put the copy-text builder, the prompt assembler, the slider clamp, and the shortcut list in plain functions so Vitest can reach them without a browser.

## Widths

- 540px is the Vivaldi side panel. No horizontal scrolling. The detail region is a bottom sheet at half the viewport when the slider is at its default.
- 1440px is the wide screen. The detail region is the right half at the default slider.
- Capture both for the cheatsheet (a stage open) and for the prompt builder (a style card selected, preview visible).

## Prompt builder checks

- Walking all six stages and choosing an option in each produces one prompt whose sections follow stage order.
- A skipped stage is absent from the text.
- Choosing Glassmorphism (and any other style) appends that style's `promptFragment` and no other style's fragment.
- Copy shows a tick and a toast. A denied clipboard shows a red error.
- Reload keeps the choices. A URL with `c` restores the shared choices.
- Keyboard: 1–6 changes stage, arrows move inside a group, `?` lists the shortcuts, Esc closes the overlay.

## Template viewer checks

- Opening a document from the stage detail shows that template rendered, at 540px and at 1440px. The detail region stays half the page.
- `M` and the raw control toggle the markdown source. Copy shows a tick and a toast. Download saves `{id}.md`.
- `#/templates` groups templates by stage. `j` and `k` move in that list. Esc backs out to the stage, then closes the detail.
- Rendered HTML from a template does not execute raw HTML. markdown-it runs with `html: false`.

## Content failures

xUnit fixtures, or the real `content/` tree with one file broken, must make the validator return a non-zero result. Cover at least: a missing stage, a duplicate id, a visual group pointing at an unknown style, a style missing a token, a prompt shell missing `{{stages}}`.

## Commands

The single local entry point arrives with the test issue. Until then, the intended commands are `dotnet test` from the repo root and, in `web/`, `npm run test` (Vitest) and `npx playwright test`.

Vitest and the production build read the JSON export. Generate it before `npm test`, `npm run build`, or Playwright against the preview server:

```bash
dotnet run --project api -- export web/public/data
```

Playwright against `npm run dev` uses the API on port 5080 instead of those files. The API has to be running.

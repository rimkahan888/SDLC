# AGENTS.md

Standing rules for this repository. Read [intent.md](intent.md) first, then this file. The linked docs are the detail; the rules below are enough to start.

## Stack

- Web: Vue 3, TypeScript, Vite, Vue Router, in `web/`. Scaffold with `npm create vue@latest` and take TypeScript, Vue Router, Vitest, and Playwright. Node must satisfy the [Vue quick start](https://vuejs.org/guide/quick-start.html) and [Playwright](https://playwright.dev/docs/intro).
- API: ASP.NET Core minimal APIs in `api/`, target framework `net10.0`. .NET 8 support ends 10 November 2026. xUnit v3 tests use `net10.0` as well.
- Official links live in [docs/references.md](docs/references.md). Paste a link before relying on an API. Do not cite blog posts for technical claims.

## Repository layout

| Path | Holds |
| --- | --- |
| `intent.md` | This project's intent. |
| `AGENTS.md` | This file. |
| `docs/` | Durable rules. |
| `templates/` | Blank documents a person copies. |
| `content/stages/` | One JSON file per stage. |
| `content/templates/` | Index of template metadata. The markdown stays in `templates/`. |
| `content/styles/` | One JSON file per visual style. |
| `content/prompt/` | The prompt shell. |
| `web/` | Vue app. Arrives with the scaffold. |
| `api/` | Minimal API. Arrives with the scaffold. |
| `tests/` | xUnit project. Arrives with the tests. |

`web/`, `api/`, `content/`, and `tests/` are specified in [docs/architecture.md](docs/architecture.md). This change does not create them.

## Rules that always apply

- Correct the plan before any application code. This change is that plan.
- Every pull request lists its done-checks and how they were verified. The blank is [templates/pull_request_template.md](templates/pull_request_template.md).
- A green test run shows the build matched the plan. A person decides whether the result is right. See [docs/testing.md](docs/testing.md).
- Stages, template indexes, prompt options, the prompt shell, and styles are data. Add an option or a style by editing `content/`.
- The application chrome stays on the dark theme in [docs/ui-rules.md](docs/ui-rules.md). A style card previews another look inside the prompt builder. It does not restyle the cheatsheet.
- The prompt builder assembles text in the browser. It does not call a model and it does not need an API key.
- Keep edits inside the accepted plan. A new idea becomes a change request ([templates/maintain-change-request.md](templates/maintain-change-request.md)) and re-enters at Plan.

## Naming

- Stage ids: `plan`, `design`, `build`, `test`, `deploy`, `maintain`.
- Other ids: lowercase, kebab-case, matching `^[a-z][a-z0-9-]*$`.
- Vue components: PascalCase filenames under `web/src/`. Composables: `useThing.ts`.
- C#: project `api/Sdlc.Api.csproj`, namespace `Sdlc.Api`, solution `SDLC.sln`. JSON from the API is camelCase.
- Template ids: `intent`, `agents`, `docs-rule`, `definition-of-done`, `pull-request`, `maintain-change-request`.

## UI defaults

Details are in [docs/ui-rules.md](docs/ui-rules.md). The short form:

- Usable at about 540px (Vivaldi's side panel) and at wide widths. No horizontal scrolling at 540px.
- The detail region is always half the page by default. From 960px up it is the right half. Below 960px it is a bottom sheet.
- Two sliders, panel size and card size, animate smoothly and persist in `localStorage`.
- Double-click a card or a step to copy plain text. Success is a tick badge and a toast. Failure is a red error that names the problem.
- Keyboard shortcuts, listed in a `?` overlay.
- An inline SVG favicon. Dark theme for the chrome (`color-scheme: dark`).
- The header always offers Cheatsheet and Prompt. The prompt preview and the stage detail share the half-page panel.

## Prompt builder

Specified in [docs/content-model.md](docs/content-model.md) and [docs/architecture.md](docs/architecture.md).

- Six stages, in order. Each stage has option groups. A group is single or multi, and required or skippable.
- Text groups render as labeled choices. Visual groups render as HTML and CSS mock cards. The Design style picker is the visual group backed by `content/styles/`.
- The live preview is the assembled prompt. Copy, download, reset, and share (the URL holds the choices).
- Choices persist in `localStorage`. The URL wins when it carries a shared selection.

## Done

The product checks are the definition of done in [intent.md](intent.md). How they are proven is [docs/testing.md](docs/testing.md). The HTTP contract is [docs/api-conventions.md](docs/api-conventions.md).

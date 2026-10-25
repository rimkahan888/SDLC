# SDLC

A cheatsheet and a prompt builder for an AI-native software lifecycle. The page walks six stages, plan through maintain, and shows the document each stage needs. The prompt builder asks for a choice at each stage, then assembles one prompt to paste into Cursor.

The repository is built with the same lifecycle it teaches. The plan and the design are in the docs below. This scaffold is the Vue app in `web/` and the ASP.NET Core minimal API in `api/`. Both target the stack in [AGENTS.md](AGENTS.md). The API uses `net10.0`. .NET 8 support ends 10 November 2026.

Stage content, the prompt shell, and the visual styles are in [`content/`](content/stages/plan.json). The prompt builder reads that content. Design shows one live mock card per style.

## The six stages

| Order | Stage | Key artifact |
| --- | --- | --- |
| 1 | Plan | [intent.md](templates/intent.md). What is changing, for whom, under which constraints, and what done means. |
| 2 | Design | [AGENTS.md](templates/AGENTS.md) and [docs rules](templates/docs-rule-example.md). Specs that outlive the conversation, including visual style. |
| 3 | Build | The accepted plan. Code starts after that acceptance. |
| 4 | Test | A [definition of done](templates/definition-of-done.md). Done is a list of checks. |
| 5 | Deploy | A [pull request](templates/pull_request_template.md). The PR is where a person reviews. |
| 6 | Maintain | A [change request](templates/maintain-change-request.md). Real use starts the loop again at Plan. |

## What the page will do

- **Cheatsheet.** The six stages as cards, with steps, done-checks, pitfalls, and templates to copy.
- **Prompt builder.** A guided pass through the same stages, at `#/prompt`. Options live in `content/`. Copy, download, reset, or share the assembled prompt. At Design, the visual style group is a grid of live HTML and CSS mock cards.

## Docs

- [intent.md](intent.md) is this project's intent.
- [AGENTS.md](AGENTS.md) is the standing rules for every new agent.
- [docs/architecture.md](docs/architecture.md) covers Vue, C#, the prompt builder, and publishing.
- [docs/content-model.md](docs/content-model.md) is the schema for stages, templates, prompt options, and styles.
- [docs/ui-rules.md](docs/ui-rules.md) covers layout, theme, copy, keyboard, and style cards.
- [docs/api-conventions.md](docs/api-conventions.md) is the HTTP contract.
- [docs/testing.md](docs/testing.md) says what the checks prove.
- [docs/references.md](docs/references.md) collects official documentation.
- [templates/](templates/intent.md) holds reusable blanks.

## Run

The page and the API are two processes. Node.js must be `^22.18.0` or `>=24.12.0` ([Vue quick start](https://vuejs.org/guide/quick-start.html), [Playwright](https://playwright.dev/docs/intro)). The API needs the [.NET 10 SDK](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview?view=aspnetcore-10.0).

### Web

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173/. The router uses [hash history](https://router.vuejs.org/guide/essentials/history-mode.html), so the cheatsheet is at http://localhost:5173/#/ and the prompt builder is at http://localhost:5173/#/prompt. In dev, Vite proxies `/api` to http://localhost:5080.

### API

```bash
dotnet run --project api
```

The process listens on http://localhost:5080. [Health checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0) answer at http://localhost:5080/health.

### Tests

```bash
dotnet test
```

```bash
cd web
npm test
npx playwright install
npx playwright test
```

`npm test` is Vitest. Playwright checks the cheatsheet and the prompt builder at 540px and at 1440px.

### Production build

```bash
cd web
npm run build
```

That type-checks, then runs `vite build --base=/SDLC/` so a project site is served from `/SDLC/` ([Vite `base`](https://vite.dev/guide/build.html)). Preview the result with `npm run preview`, which passes the same `--base=/SDLC/`, at http://localhost:4173/SDLC/.

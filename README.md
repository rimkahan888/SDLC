# SDLC

A cheatsheet and a prompt builder for an AI-native software lifecycle. The page walks six stages, plan through maintain, and shows the document each stage needs. The prompt builder asks for a choice at each stage, then assembles one prompt to paste into Cursor.

The repository is built with the same lifecycle it teaches. This change is Plan and Design: the intent, the standing rules, and the specs. The Vue app and the C# API wait until the plan is accepted.

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
- **Prompt builder.** A guided pass through the same stages. Options live in `content/`. At Design, a style picker shows live HTML and CSS cards for 20 looks, and each chosen style adds a fragment to the prompt. Copy, download, reset, or share the result.

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

Nothing runs yet. How to start the app arrives with the scaffold.

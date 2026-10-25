# Intent

Written from [templates/intent.md](templates/intent.md).

## Context

Johan builds projects with coding agents. Each new agent starts with no memory of how he works, so the same corrections return: write a plan first, use the official docs, say what done means, and keep the UI usable in a narrow side panel.

This repository is the fix he can reuse. It will be a web page, and it is the first project built with the lifecycle that page teaches. The audience is Johan and every later project that should start from the same documents.

The lifecycle stays plan, design, build, test, deploy, maintain. An agent can help at each stage. The payoff is a repeatable workflow and less back-and-forth fixing.

## The change

Specify, and later build, a Vue and C# guidance page with two jobs:

1. A cheatsheet of the six stages and the document each one needs.
2. A prompt builder: a guided decision tree through those stages that assembles one prompt to paste into Cursor. At Design, a visual style picker shows live HTML and CSS mock cards. Each chosen style adds a prompt fragment.

This change is the plan and the design. It adds the documents below and no application code.

## Goals

- Show the six stages, the artifact for each, and the checks that mean done.
- Ship templates a new project can copy: intent, AGENTS.md, a docs rule, definition of done, pull request, change request.
- Make the prompt builder's options and the 20 style cards data in `content/`. A new option or style is a content edit.
- Publish a static site. Keep the C# API for local and dev use, where it validates that content.
- Work in Vivaldi's side panel at about 540px, in a dark theme, with the detail region at half the page.

## Non-goals

- Scaffolding the Vue app or the C# API in this change.
- Calling a model from the page. The builder assembles text locally. Cursor is where that text runs.
- Accounts, a database, or editing content in the browser.
- A light theme for the application chrome. Style cards preview other looks inside the builder.
- Hosting a long-running C# process on GitHub Pages.

## Screenshots and references

There is no UI yet. The repo starts from a license and a one-line README.

- Workflow source: the SDLC framework notes. Plan produces `intent.md`. Design produces specs, `AGENTS.md`, and `docs/`. Build waits until the plan is accepted. Test defines done as checks. Deploy uses the pull request as the review boundary. Maintain returns to Plan.
- Work tracker: GitHub issues in [rimkahan888/SDLC](https://github.com/rimkahan888/SDLC/issues).

Screenshots join a later change, once a screen exists.

## Constraints

- Web: Vue 3, TypeScript, Vite, and Vue Router. The Node version has to satisfy both the [Vue quick start](https://vuejs.org/guide/quick-start.html) and [Playwright](https://playwright.dev/docs/intro).
- API: ASP.NET Core minimal APIs on .NET 10 (`net10.0`). .NET 8 support ends 10 November 2026, so the API targets the current LTS, supported until 14 November 2028.
- Dark application chrome. The detail region defaults to half the page: the right half from 960px up, a bottom sheet below that.
- Usable at about 540px wide.
- Technical claims cite official docs, collected in [docs/references.md](docs/references.md).
- Stages, templates, prompt options, and styles are content. Editing them does not require a code change.
- Application code waits until this intent is accepted.

## Official docs

The full set is [docs/references.md](docs/references.md). This plan depends on:

- [Vue](https://vuejs.org/guide/introduction.html)
- [Vite build and `base`](https://vite.dev/guide/build.html)
- [Vue Router history modes](https://router.vuejs.org/guide/essentials/history-mode.html)
- [ASP.NET Core minimal APIs (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview?view=aspnetcore-10.0)
- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Diagrams on GitHub](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)

## Open questions

None. The API target is .NET 10 (`net10.0`). .NET 8 support ends 10 November 2026 ([support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [release schedule](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support)).

## Definition of done

The guidance page is done when:

- [ ] All six stages render from content, in order, with the one-liner and the key artifact.
- [ ] The detail region defaults to half the page (right half at 960px and wider, bottom sheet below that). The panel-size and card-size sliders persist across reloads.
- [ ] The layout works at 540px and at 1440px, with no horizontal scrolling at 540px.
- [ ] Double-click on a card or a step copies plain text, shows a tick and a toast, and shows a red error when the copy fails.
- [ ] Keyboard shortcuts work and match the `?` overlay.
- [ ] The page has an inline SVG favicon and a dark theme.
- [ ] Every template can be viewed, copied, and downloaded.
- [ ] A project run can be created, ticked, reloaded, exported, and imported.
- [ ] The prompt builder walks all six stages and copies a coherent prompt that can be pasted into Cursor. Download, reset, and a shareable URL work. It is usable at 540px from the keyboard.
- [ ] The Design stage shows the 20 style mock cards. Each chosen style adds its prompt fragment.
- [ ] Invalid content fails the API at startup and fails the static export.
- [ ] The public site is the static build on GitHub Pages.
- [ ] Johan has reviewed the live page.

This change is done when these documents are in the repo, the links resolve, the architecture diagram renders on GitHub, and the plan is accepted.

# References

Official documentation for every technology this project uses. One line each on why it is here. No blog posts.

## App

| Technology | Official docs | Why it is here |
| --- | --- | --- |
| Vue 3 | [Introduction](https://vuejs.org/guide/introduction.html) | The cheatsheet and the prompt builder are a Vue application. |
| Vue quick start | [Quick start](https://vuejs.org/guide/quick-start.html) | `npm create vue@latest` is the scaffold, and it states the Node versions it supports. |
| Vite | [Guide](https://vite.dev/guide/) | Dev server and production build for `web/`. |
| Vite `base` | [Building for production](https://vite.dev/guide/build.html) | Project Pages are served from `/SDLC/`. `vite build --base=/SDLC/` rewrites asset URLs. `import.meta.env.BASE_URL` is the prefix for exported JSON. |
| Vite `public` | [The public directory](https://vite.dev/guide/assets.html#the-public-directory) | The build-time JSON export is copied into the site as-is. |
| Vite proxy | [Server options](https://vite.dev/config/server-options.html#server-proxy) | In dev, the browser talks only to Vite. `/api` is proxied to the C# process. |
| Vue Router | [Getting started](https://router.vuejs.org/guide/) | Cheatsheet, stage, template, and prompt routes. |
| History mode | [History modes](https://router.vuejs.org/guide/essentials/history-mode.html) | Hash mode needs no server rewrite, which a static host cannot do. |
| TypeScript | [Handbook](https://www.typescriptlang.org/docs/) | The web app is TypeScript. Vite transpiles it and does not typecheck it; `tsc --noEmit` does. |
| markdown-it | [markdown-it](https://markdown-it.github.io/) | Renders template markdown. Configure it with `html: false` so raw HTML in a template is shown as text. |

## API

| Technology | Official docs | Why it is here |
| --- | --- | --- |
| Minimal APIs | [Overview (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview?view=aspnetcore-10.0) | The local API is a minimal API on `net10.0`: routes declared on `WebApplication`, no controllers. |
| CORS | [Enable CORS (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0) | Dev-only policy so a browser pointed straight at the API still works. |
| Problem details | [Error handling (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-10.0) | Unknown ids return a problem-details body. |
| JSON names | [Customize properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties) | Responses use camelCase. Set `JsonNamingPolicy.CamelCase` explicitly. |
| .NET support | [Support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) | .NET 8 support ends 10 November 2026, which is why the API targets .NET 10. .NET 10 LTS runs until 14 November 2028. |
| Release dates | [Releases and support](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support) | Same dates, on the docs site. The decision is recorded in [intent.md](../intent.md) and [architecture.md](architecture.md). |

## Tests

| Technology | Official docs | Why it is here |
| --- | --- | --- |
| xUnit v3 | [Getting started](https://xunit.net/docs/getting-started/v3/getting-started) | API and content-validation tests. The v3 guide targets .NET 8 or later. This repo's test project targets `net10.0`. |
| xUnit home | [xunit.net](https://xunit.net/) | Project home for the runner named in the backlog. |
| Vitest | [Guide](https://vitest.dev/guide/) | Vue component and pure-function tests. Reuses the Vite config. |
| Playwright | [Intro](https://playwright.dev/docs/intro) | End-to-end tests. States its own Node support. |
| Viewports | [Emulation](https://playwright.dev/docs/emulation) | The two widths are 540 and 1440. |
| Screenshots | [Screenshots](https://playwright.dev/docs/screenshots) | Capture the overview and an open stage at both widths. |

## Hosting

| Technology | Official docs | Why it is here |
| --- | --- | --- |
| GitHub Actions | [Actions](https://docs.github.com/en/actions) | Build, test, and the Pages deploy workflow. |
| GitHub Pages | [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | Static hosting: HTML, CSS, and JavaScript from a repository. |
| Creating a site | [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) | Pages publishes static files and does not support server-side languages such as PHP, Ruby, or Python. A project site is served at `https://<owner>.github.io/<repository>/`. |
| Publishing source | [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) | A custom Actions workflow builds the site and deploys the artifact. |
| Mermaid | [Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) | Fenced `mermaid` blocks render in this repo's markdown. |

## Browser platform

| API | Official docs | Why it is here |
| --- | --- | --- |
| `localStorage` | [Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | Sliders, project runs, and prompt choices persist here. |
| Clipboard | [`Clipboard.writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) | Copy is `navigator.clipboard.writeText`. It rejects with `NotAllowedError` when writing is not allowed. |
| Secure context | [Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) | Clipboard writes require a secure context. Localhost and GitHub Pages (HTTPS) both qualify. |
| `color-scheme` | [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) | Dark chrome, including native controls and scrollbars. |
| Reduced motion | [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) | The size sliders animate unless the person has asked for less motion. |
| Contrast | [WCAG 2.2 contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | App-chrome text meets 4.5:1. Style fragments tell the agent to do the same in generated UI. |

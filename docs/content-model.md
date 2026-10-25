# Content model

Stages, templates, prompt-builder options, and visual styles. All of it is data. A new option or a new style is a file under `content/`.

The cheatsheet reads stages and templates. The prompt builder reads the same stages' option groups, the prompt shell, and the style files. Wire shapes and routes are in [api-conventions.md](api-conventions.md). How the cards look is in [ui-rules.md](ui-rules.md).

## Files

```text
content/stages/<id>.json
content/templates/<id>.json
content/styles/<id>.json
content/styles/order.json
content/prompt/shell.md
content/prompt/stage.md
templates/<file>.md
```

`content/templates/<id>.json` points at a file under `templates/`. The markdown is not copied into the JSON by hand.

## Stage

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | One of `plan`, `design`, `build`, `test`, `deploy`, `maintain`. Matches the filename. |
| `order` | number | `1` through `6`, unique. |
| `name` | string | Card title and prompt heading. |
| `oneLiner` | string | One sentence on the card. |
| `goal` | string | What the stage is for. |
| `keyArtifact` | string | The document this stage produces. |
| `steps` | Step[] | At least one. |
| `doneChecks` | Check[] | At least one. Ids are stable; the project tracker stores them. |
| `pitfalls` | Pitfall[] | May be empty. |
| `quotes` | Quote[] | May be empty. |
| `templates` | string[] | Template ids. May be empty. Every id exists. |
| `optionGroups` | OptionGroup[] | May be empty. The prompt builder renders these. |

Step: `{ "id", "title", "text" }`. Check and pitfall: `{ "id", "text" }`. Quote: `{ "text", "source" }`.

Ids inside a stage are unique across steps, checks, and pitfalls. Every id matches `^[a-z][a-z0-9-]*$`. Strings are non-empty after trimming.

The six stages, and the group ids the builder expects:

| Order | Id | Key artifact | Option groups |
| --- | --- | --- | --- |
| 1 | `plan` | `intent.md` | `change-type` (single, required), `docs` (multi, skippable) |
| 2 | `design` | `AGENTS.md` and `docs/` | `stack` (single, required), `agents` (single, required), `rules` (multi, skippable), `visual-style` (multi, skippable, visual) |
| 3 | `build` | Accepted plan | `plan-first` (single, required, default `accept-plan`), `verify` (single, skippable) |
| 4 | `test` | Definition of done | `checks` (multi, required), `test-types` (multi, skippable) |
| 5 | `deploy` | Pull request | `boundary` (single, required, default `pr`), `ci` (single, skippable), `target` (single, required, default `pages`) |
| 6 | `maintain` | Change request | `loop` (single, required, default `change-request`) |

`plan-first` choices are `accept-plan` (do not write code until the plan is accepted) and `implement` (implement in this session). `verify` choices are `agent` and `author`. `boundary` is `pr`. `ci` is `actions` or `none`. `target` is `pages` or `local`. `loop` is `change-request`. Fragment text for those ids is written with the stage content; the ids above are the contract.

## Template

On disk, `content/templates/<id>.json`:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Filename, and the id stages use. |
| `name` | string | Label in the UI. |
| `stage` | string | A stage id. That stage's `templates` array includes this id. |
| `file` | string | Path under `templates/`, no `..`. |

On the wire, `file` is replaced by `markdown`, the file's contents.

| Id | File | Stage |
| --- | --- | --- |
| `intent` | `templates/intent.md` | `plan` |
| `agents` | `templates/AGENTS.md` | `design` |
| `docs-rule` | `templates/docs-rule-example.md` | `design` |
| `definition-of-done` | `templates/definition-of-done.md` | `test` |
| `pull-request` | `templates/pull_request_template.md` | `deploy` |
| `maintain-change-request` | `templates/maintain-change-request.md` | `maintain` |

## Option groups

A group is one decision in the prompt builder.

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Unique in the stage. |
| `label` | string | Shown above the choices. |
| `help` | string | One sentence. |
| `selection` | `single` or `multi` | Radio, or checkbox. |
| `required` | boolean | `false` means the group is skippable and the completeness line ignores it. |
| `presentation` | `text` or `visual` | `text` is a labeled row. `visual` is a preview card. |
| `defaultOptionIds` | string[] | Optional. Length 0 or 1 when `selection` is `single`. Each id exists after expansion. |
| `options` | Option[] | Inline choices. |
| `optionsFrom` | `"styles"` | Build the choices from `content/styles/`. |

A group has exactly one of `options` and `optionsFrom`.

Option:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Unique in the group. |
| `label` | string | Row or card title. |
| `detail` | string | Second line on a text row. |
| `promptFragment` | string | Inserted into the prompt when selected. Instructions to the agent, with no mention of the picker. |
| `starterFiles` | string[] | Optional template ids. The result offers those files as extra downloads, and the prompt names them. |
| `preview` | object | Required on an inline option when `presentation` is `visual`. `{ "styleId" }` of an existing style. |

`optionsFrom: "styles"` is how the style picker plugs in. The loader turns each style into an option:

- `id`, `label`, `detail` come from the style's `id`, `name`, and `description`.
- `promptFragment` is the style's `promptFragment`.
- `preview` is `{ "styleId", "bestFor", "tokens" }` from that style.

The wire format always has `options` and never has `optionsFrom`. The client renders `presentation: "visual"` from `preview.tokens` and does not care whether the source was inline or a style file. Tokens are not copied into the stage JSON by hand.

A visual group may instead list a subset with inline options that each set `preview.styleId`. The Design picker uses `optionsFrom` so a new style file appears without editing the stage.

### Choices, skips, and the URL

```json
{
  "selections": {
    "plan.change-type": ["feature"],
    "design.visual-style": ["glassmorphism", "swiss-design"]
  },
  "skippedStages": ["maintain"]
}
```

The key is `{stageId}.{groupId}`. Values are option ids. `localStorage` key: `sdlc.prompt`.

The share URL is `#/prompt?c=` plus `encodeURIComponent` of that JSON. When `c` is present and parses, it replaces the stored value. When it does not parse, the page shows the red error and keeps the stored value.

Skip on a skippable group clears that key. Skip stage clears every key for that stage and adds the stage id to `skippedStages`. Reset deletes `sdlc.prompt` and removes `c`.

Defaults apply when a group has no stored selection and the stage is not skipped. A required group with no selection and no default counts as still open. A skipped stage does not.

### Assembly

`content/prompt/shell.md` contains the placeholder `{{stages}}` once. `content/prompt/stage.md` contains `{{order}}`, `{{name}}`, and `{{fragments}}` once each. No other `{{` sequences.

```markdown
You are an agent working in this repository. Follow the decisions below. Read the named docs and any starter files before you write code.

{{stages}}

When you are unsure, stop and ask. Use the official documentation named above.
```

```markdown
## {{order}}. {{name}}

{{fragments}}
```

1. Walk stages by `order`.
2. Omit a stage that is skipped, or that has no selected option.
3. Inside a stage, walk groups in file order. Omit a group with nothing selected.
4. For a single group, append that option's `promptFragment`. For a multi group, append each selected option's fragment in option order, separated by a blank line.
5. Replace `{{fragments}}`, then `{{order}}` and `{{name}}`. `order` is the stage's own number, so Test stays `4` when Design is omitted.
6. Join stage blocks with a blank line and replace `{{stages}}`.
7. When any selected option has `starterFiles`, append a final `## Starter files` section. One line per template id, the `file` path from the template index.

### Sample result

Choosing Plan → feature, Plan → the Vue doc, Design → Glassmorphism, and Test → the 540px check:

```markdown
You are an agent working in this repository. Follow the decisions below. Read the named docs and any starter files before you write code.

## 1. Plan

This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture.

Official docs: Vue — https://vuejs.org/guide/introduction.html

## 2. Design

Visual style: Glassmorphism. Use translucent panels over a saturated background, with backdrop-filter blur, a hairline light border, and a soft shadow. Keep text readable: meet WCAG 2.2 AA contrast (4.5:1) against the surface the text actually sits on. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

## 4. Test

Done check: at 540px wide there is no horizontal scrolling, and the detail region is a bottom sheet at half the viewport by default.

When you are unsure, stop and ask. Use the official documentation named above.
```

## Example: Plan

`docs` lists three options here. The stage content adds one option per entry in [references.md](references.md), same shape, fragment `Official docs: {name} — {url}`.

```json
{
  "id": "plan",
  "order": 1,
  "name": "Plan",
  "oneLiner": "Describe the change, the constraints, and the official docs before any code.",
  "goal": "Give the next agent enough context that it does not guess.",
  "keyArtifact": "intent.md",
  "steps": [
    {
      "id": "describe",
      "title": "Describe the change",
      "text": "Write what is changing, who it is for, and the constraints."
    },
    {
      "id": "docs",
      "title": "Paste official docs",
      "text": "Find the official documentation and paste the links into the intent."
    },
    {
      "id": "done",
      "title": "Define done",
      "text": "List the checks that will decide the work is finished."
    }
  ],
  "doneChecks": [
    {
      "id": "answers",
      "text": "intent.md says what, why, for whom, the constraints, and what done means."
    },
    {
      "id": "links",
      "text": "Every technical claim has an official docs link."
    }
  ],
  "pitfalls": [
    {
      "id": "guessing",
      "text": "Leaving the agent to guess an API instead of pasting the official docs."
    }
  ],
  "quotes": [
    {
      "text": "Go find the official docs yourself and paste the link so the agent is not guessing.",
      "source": "SDLC framework notes"
    }
  ],
  "templates": ["intent"],
  "optionGroups": [
    {
      "id": "change-type",
      "label": "Change type",
      "help": "What kind of work is this?",
      "selection": "single",
      "required": true,
      "presentation": "text",
      "options": [
        {
          "id": "new-app",
          "label": "New app",
          "detail": "Start a project that does not exist yet.",
          "promptFragment": "This is a new app. Propose the smallest structure that matches the constraints, and wait for the plan to be accepted before you add it.",
          "starterFiles": ["intent"]
        },
        {
          "id": "feature",
          "label": "Feature",
          "detail": "Add something to an existing project.",
          "promptFragment": "This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture."
        },
        {
          "id": "bug-fix",
          "label": "Bug fix",
          "detail": "Change an existing behavior that is wrong.",
          "promptFragment": "This is a bug fix. State the current behavior and the intended behavior before changing code. Touch only the files that behavior requires."
        },
        {
          "id": "refactor",
          "label": "Refactor",
          "detail": "Change the structure and keep the behavior.",
          "promptFragment": "This is a refactor. Preserve the behavior a person can observe. Call out any behavior you cannot prove is unchanged."
        }
      ]
    },
    {
      "id": "docs",
      "label": "Official docs to include",
      "help": "Skip this when you will paste the links yourself.",
      "selection": "multi",
      "required": false,
      "presentation": "text",
      "options": [
        {
          "id": "vue",
          "label": "Vue",
          "detail": "Vue 3 guide.",
          "promptFragment": "Official docs: Vue — https://vuejs.org/guide/introduction.html"
        },
        {
          "id": "minimal-apis",
          "label": "ASP.NET Core minimal APIs",
          "detail": "The .NET 8 overview.",
          "promptFragment": "Official docs: ASP.NET Core minimal APIs — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview?view=aspnetcore-8.0"
        },
        {
          "id": "playwright",
          "label": "Playwright",
          "detail": "End-to-end tests.",
          "promptFragment": "Official docs: Playwright — https://playwright.dev/docs/intro"
        }
      ]
    }
  ]
}
```

## Example: Test

The rest of the Test stage object uses the same fields as Plan. Shown here: the fields the builder adds, plus enough of the stage to place them.

```json
{
  "id": "test",
  "order": 4,
  "name": "Test",
  "oneLiner": "Define done as checks before calling the work finished.",
  "goal": "The engineer names the checks. The agent does not invent the finish line.",
  "keyArtifact": "definition of done",
  "steps": [
    {
      "id": "name-checks",
      "title": "Name the checks",
      "text": "Write what a person can observe when the work is done, including the widths and the states that matter."
    }
  ],
  "doneChecks": [
    {
      "id": "checks-listed",
      "text": "The change's definition of done lists observable checks before the build starts."
    }
  ],
  "pitfalls": [
    {
      "id": "agent-victory",
      "text": "Treating a green run as proof the result is right."
    }
  ],
  "quotes": [],
  "templates": ["definition-of-done"],
  "optionGroups": [
    {
      "id": "checks",
      "label": "Done-checks",
      "help": "Pick every check this change has to meet.",
      "selection": "multi",
      "required": true,
      "presentation": "text",
      "options": [
        {
          "id": "layout-540",
          "label": "540px layout",
          "detail": "Side-panel width.",
          "promptFragment": "Done check: at 540px wide there is no horizontal scrolling, and the detail region is a bottom sheet at half the viewport by default."
        },
        {
          "id": "layout-wide",
          "label": "Wide layout",
          "detail": "Desktop width.",
          "promptFragment": "Done check: at 1440px wide the detail region is the right half of the page by default, and the work stays usable beside it."
        },
        {
          "id": "a11y",
          "label": "Accessibility",
          "detail": "Keyboard, focus, and contrast.",
          "promptFragment": "Done check: every action works from the keyboard, focus is visible, and text on the application chrome meets WCAG 2.2 AA contrast (4.5:1). https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
        },
        {
          "id": "localization",
          "label": "Localization",
          "detail": "Strings still resolve after the change.",
          "promptFragment": "Done check: user-visible strings still go through this project's localization path. Add no hard-coded copy on a second path."
        },
        {
          "id": "copy-feedback",
          "label": "Copy feedback",
          "detail": "Tick and toast, red error on failure.",
          "promptFragment": "Done check: copying plain text shows a tick and a toast, and a failed copy shows a red error that includes the browser's message."
        },
        {
          "id": "keyboard",
          "label": "Keyboard",
          "detail": "Shortcuts match the ? overlay.",
          "promptFragment": "Done check: the keyboard shortcuts work and the ? overlay lists the same set."
        }
      ]
    },
    {
      "id": "test-types",
      "label": "Test types",
      "help": "Skip this when the change needs no new tests.",
      "selection": "multi",
      "required": false,
      "presentation": "text",
      "options": [
        {
          "id": "unit",
          "label": "Unit tests",
          "detail": "xUnit for C#, Vitest for Vue.",
          "promptFragment": "Add or update unit tests. xUnit for C#: https://xunit.net/docs/getting-started/v3/getting-started. Vitest for Vue: https://vitest.dev/guide/."
        },
        {
          "id": "e2e",
          "label": "End-to-end tests",
          "detail": "Playwright at 540px and 1440px.",
          "promptFragment": "Add or update Playwright tests at 540px and 1440px, with screenshots. https://playwright.dev/docs/intro"
        }
      ]
    }
  ]
}
```

## Example: Design, visual group

Text groups on Design (`stack`, `agents`, `rules`) use the same option shape as Plan. `agents` is the one that offers a starter file:

```json
{
  "id": "generate",
  "label": "Generate AGENTS.md",
  "detail": "Start from the AGENTS template.",
  "promptFragment": "Write AGENTS.md for this project. Start from the starter file templates/AGENTS.md and fill it from the decisions in this prompt.",
  "starterFiles": ["agents"]
}
```

The style picker is the visual group. It has no inline options:

```json
{
  "id": "visual-style",
  "label": "Visual style",
  "help": "Pick one or more looks. Skip this when the change has no UI.",
  "selection": "multi",
  "required": false,
  "presentation": "visual",
  "optionsFrom": "styles"
}
```

After expansion, Glassmorphism is an option whose `preview.tokens` are the style's tokens and whose `promptFragment` is the style's fragment. The mock card is the single component in [ui-rules.md](ui-rules.md).

## Style

One file, `content/styles/<id>.json`. The mock card and the prompt both read this file.

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Filename. |
| `name` | string | Card kicker and the option label. |
| `description` | string | One or two sentences. Becomes the option `detail`. |
| `bestFor` | string | One sentence, shown under the card in chrome text. |
| `tokens` | object | The mock's CSS variables. Every key below, each a string. |
| `promptFragment` | string | What the agent should build. Include a reminder to keep text readable. |

Token keys, mapped to the variables on the mock:

| Key | CSS variable | What to put in it |
| --- | --- | --- |
| `background` | `--mock-bg` | Page fill behind the card. A gradient is allowed. |
| `surface` | `--mock-surface` | The card fill. |
| `text` | `--mock-text` | Title and body color. |
| `muted` | `--mock-muted` | Kicker color. |
| `accent` | `--mock-accent` | Button fill. |
| `border` | `--mock-border` | The card's `border` value, including width and style. |
| `radius` | `--mock-radius` | A length. |
| `shadow` | `--mock-shadow` | The card's `box-shadow`. |
| `font` | `--mock-font` | A family stack. No `url(`. The mock does not fetch a font. |
| `backdrop` | `--mock-backdrop` | A `backdrop-filter` value, or `none`. |

Extra keys are a validation error. The card structure is shared; a look that needs a torn edge or a sticker has to be expressible with these tokens. The fragment carries the fuller direction for the agent.

`content/styles/order.json` is an array of ids. The required catalog below is listed in that order. A style file whose id is not in the array sorts after the listed ids, by id, so a 21st look is a new JSON file and no code change. A missing required id fails validation.

| Id | Name |
| --- | --- |
| `minimalism` | Minimalism |
| `maximalism` | Maximalism |
| `futuristic` | Futuristic |
| `vector-art` | Vector Art |
| `collage-art` | Collage Art |
| `retro` | Retro |
| `cyberpunk` | Cyberpunk |
| `pop-art` | Pop Art |
| `glassmorphism` | Glassmorphism |
| `clay-style` | Clay Style |
| `pixel-art` | Pixel Art |
| `editorial` | Editorial |
| `y2k` | Y2K |
| `swiss-design` | Swiss Design |
| `surreal` | Surreal |
| `bohemian` | Bohemian |
| `victorian` | Victorian |
| `graffiti` | Graffiti |
| `aurora` | Aurora |
| `handwritten` | Handwritten |

### Example: Glassmorphism

`content/styles/glassmorphism.json`:

```json
{
  "id": "glassmorphism",
  "name": "Glassmorphism",
  "description": "Translucent panels over a saturated background, with blur, a hairline light border, and a soft shadow.",
  "bestFor": "Dashboards, media, and overlays where the background holds the color and the panel stays out of the way.",
  "tokens": {
    "background": "linear-gradient(145deg, #5b4bff 0%, #d946ef 48%, #22d3ee 100%)",
    "surface": "rgba(255, 255, 255, 0.18)",
    "text": "#f7f8fb",
    "muted": "rgba(247, 248, 251, 0.78)",
    "accent": "#ffffff",
    "border": "1px solid rgba(255, 255, 255, 0.38)",
    "radius": "20px",
    "shadow": "0 10px 30px rgba(18, 16, 48, 0.28)",
    "font": "system-ui, sans-serif",
    "backdrop": "blur(18px)"
  },
  "promptFragment": "Visual style: Glassmorphism. Use translucent panels over a saturated background, with backdrop-filter blur, a hairline light border, and a soft shadow. Keep text readable: meet WCAG 2.2 AA contrast (4.5:1) against the surface the text actually sits on. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
}
```

The translucent surface sits on a gradient, so the mock's text contrast depends on what shows through. The fragment tells the agent to hit 4.5:1 on the real surface, including a scrim when the blur is not enough. App-chrome contrast is a separate rule in [ui-rules.md](ui-rules.md).

## Project run

Client state for the later tracker. Not content, and not part of the prompt.

`localStorage` key `sdlc.runs` is an array of:

```json
{
  "id": "string",
  "name": "string",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "checks": {
    "plan.answers": true
  }
}
```

The check key is `{stageId}.{checkId}` from `doneChecks`. Export and import are that JSON. Unknown check ids are kept on import and ignored by the UI.

## Validation

Fail the process, with the file path and the reason, when any of these are true:

- A required stage id is missing, duplicated, or out of order.
- A stage field is missing, or a string is empty.
- A template id is unknown, its `file` escapes `templates/`, or the file is empty.
- A template's `stage` does not list that template.
- A group is missing a field, has both `options` and `optionsFrom`, or has neither.
- `optionsFrom` is not `"styles"`.
- A `single` group has more than one default id.
- A visual option, after expansion, has no `preview.tokens`.
- A required style id is missing, a style is missing a token key, a token is empty, or `font` contains `url(`.
- The prompt shell or stage template is missing a required placeholder, or contains some other `{{`.
- A `starterFiles` entry is not a template id.

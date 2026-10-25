# AGENTS.md

<!--
Copy this file to AGENTS.md at the repository root and fill it in.
A new agent reads that copy and the intent, and nothing else, on its first turn.
Links below point at the blanks in this folder. After you copy the file, point them at your filled documents.
Delete these comments. Replace every "Fill in" line.
-->

Standing rules for every agent that works in this repository. Read [intent.md](intent.md) first, then this file.

## Stack

**Fill in:** Languages, frameworks, and the versions you will actually install. Link official docs.

- App: [framework and version.]
- API: [framework and version.]
- Tests: [runners.]

## Repository layout

**Fill in:** The top-level folders and what belongs in each.

| Path | Holds |
| --- | --- |
| [path] | [what lives here.] |

## Rules that always apply

- Read the intent and this file before editing. The plan is accepted when a person says it is.
- Wait for that acceptance before writing application code.
- Every pull request names its done-checks and how they were verified. Start from [pull_request_template.md](pull_request_template.md).
- Paste official documentation links for any API or tool you rely on. Record them in the project's references file.
- Durable rules live under `docs/` and outlive the chat. [docs-rule-example.md](docs-rule-example.md) is the shape of a new rule.
- Content the product renders (copy, options, themes, checklists) lives in data files. A new option is a data edit.

## Naming

**Fill in:** File, type, and identifier conventions.

- [Convention.]

## UI defaults

**Fill in:** Delete this section when the project has no UI. Otherwise list the layout, theme, and feedback rules an agent must keep. Point at the durable UI rule file for the details.

- [Width, theme, and the feedback for success and failure.]

## Product-specific features

**Fill in:** Behavior that is easy to "simplify" away. Write the rule and the file that specifies it.

- [Feature, and where its spec lives.]

## Done

A change is finished only when its [definition of done](definition-of-done.md) is checked. Tests show the build matches the plan. A person decides whether the result is right.

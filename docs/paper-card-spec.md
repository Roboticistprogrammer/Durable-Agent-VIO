# Spec: a `paper` card for VIO research

A design for a card that shows the fields a VIO researcher scans for. **It needs code changes**: upstream has no `paper` component, and the server only accepts components listed in the SDK. Until you build it, use the zero-code path at the end.

## Fields

| Field | Required | Example value | Filled from |
|---|---|---|---|
| `title` | yes | paper title, 12 words or fewer | item title |
| `contribution` | yes | one sentence: what is new | abstract |
| `evidence` | yes | "ATE x cm on EuRoC MH_05, y cm on TUM-VI room1" | researcher claims (datasets with metrics and numbers) |
| `code` | yes | repository URL, or `none` | abstract, links on the page |
| `sensors` | no | mono / stereo / event / IMU rate | researcher claims |
| `baselines` | no | OpenVINS, VINS-Fusion | researcher claims |
| `flight_tested` | no | `real`, `sim` or `no` | researcher claims |
| `compute` | no | platform and runtime | researcher claims |
| `venue` | no | arXiv id, journal or conference, year | feed |
| `limitations` | no | one sentence | paper text |

Rule (server side): an hfs classification exists, as for `fact_check`. Optional extra rule: `code` must be filled, with the literal word `none` allowed, so the agent states whether code exists instead of skipping it.

The researcher already returns `claims` (up to four), `evidence_urls` and `actionability`, and the prompts in this kit steer the claims toward these fields.

## Code to change

1. `apps/shared/packages/dna-sdk/src/components.ts`

```ts
export const NEWS_COMPONENTS = [
  // ...existing entries...
  "paper",
] as const;

// inside COMPONENT_SPECS:
paper: {
  use: "a research paper or preprint worth reading",
  required: ["title", "contribution", "evidence", "code"],
  rule: "an hfs classification exists",
},
```

2. `apps/dna-server-api/src/news/components.ts`: add `paper` next to `fact_check` in `checkComponent`, so it also requires an hfs classification.
3. `apps/dna-client-browser/fe/src/components/cards/PaperCard.vue` and an entry in `registry.ts`. The registry is typed `Record<CardComponent, Component>`, so the build fails until it is added. Copy `BriefCard.vue` as a starting point. Unknown values render as a brief with a console warning, but the server rejects them first.
4. `apps/dna-client-tui/src/cards.ts`: add a `case "paper":` to the switch, as for `fact_check`.
5. The clients and tests are typed against the component list, so run `just test unit` and `just test ui` afterwards.
6. `agents/news-desk/SYSTEM_PROMPT.md`: in **Writing research cards**, change the first bullet to prefer `paper` for preprints. The catalog table is generated from the SDK and appears automatically.

## Example props (placeholders)

```json
{
  "title": "<paper title in 12 words or fewer>",
  "contribution": "<one sentence: what is new>",
  "evidence": "<metric> on <dataset>: <number>, against <baseline>: <number>",
  "code": "https://github.com/<org>/<repo>",
  "sensors": "<mono|stereo|event> + IMU",
  "flight_tested": "real",
  "venue": "arXiv <id>"
}
```

The desk prompt's UI text rules apply: no em dashes, en dashes, spaced hyphens, bullet dots or ellipses in props.

## Zero-code path (works now)

Use `brief` with `title` and a two-sentence `summary` shaped like this, which is what the desk prompt in this kit asks for:

1. What the method does and on which sensors.
2. The strongest evidence with dataset and metric, and whether code is released.

Use `release` for tool releases, `signal_alert` for deadlines and datasets, `fact_check` when a headline claim needs checking.

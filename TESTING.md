# Testing the VIO-for-UAV fork

The working fork is `pi-durable-news-agent/`, on branch `vio` (uncommitted). `overlay/` is the same set of changes as a drop-in for a fresh clone.

## Status

| Area | State |
|---|---|
| Keywords (15 topics + hint words), 14 sources | Applied and tested on fixtures |
| 5 jev commands, 3 agent prompts | Applied; structure checked against upstream; faux sweep passes |
| arXiv-style fixture and VIO vocabulary in the fixture judge | Added, so the offline demo and tests can run the VIO config |
| `DNA_CONFIG_DIR` setting, tests pinned to a frozen upstream config | Added; upstream's own tests stay green |
| `tests/vio-config.test.ts` (4 tests) | Added, passing |
| Server suite | 109 pass, 0 fail, 1 skipped (live network) |
| `tsc`, `oxlint`, `oxfmt --check` | Pass (upstream has lint warnings, none from this work) |
| 2 SSE streaming tests (`dna-server-api` #79, `dna-cli` #4) | Fail here, identically on pristine upstream. Likely Node 22 (repo needs 24) |
| Browser UI suite, TUI smoke, `just combos dev` in a browser | **Not run** |
| Live source fetch (2026-10-28) | **Done for 12 of 14.** 5 arXiv feeds return entries (12 / 3 / 1 / 1 / 2 over a 14-day window), 5 GitHub feeds are valid Atom, PX4 forum 25 entries, Hugging Face Papers 30 links. Both Hacker News sources got 403 from the test machine's network (Algolia 403, Firebase connection reset), so they are unverified |
| First live sweep (2026-10-28, `anthropic/claude-haiku-5.5`, search mode `web`) | **Done.** 7 candidates, 7 presented, audit clean, 38 tool calls, about $0.02 total, images $0. All 7 cards came from the `arXiv: visual-inertial odometry` source; no AI-agent news. Cards put dataset and metric next to numbers (AnchorFlow-VIO: LaMAria, 5 m recall 84.6%) and flag missing benchmarks (GOFusion: no EuRoC / TUM-VI numbers) |
| Not built | `arxiv` fetcher, `paper` card, citation alerts, profile-aware jev (see `docs/paper-card-spec.md`) |

## 0. Prerequisites

- **Node 24.** `nvm install 24 && nvm use 24`. Node 22 runs most things, but the two SSE tests above fail on it.
- **zsh**, because the `just` recipes declare it. Install it, or run any recipe with `just --shell bash --shell-arg -cu <recipe>`.
- `cd pi-durable-news-agent && git checkout vio && npm install`.

## 1. Fast checks (free, offline, about 5 s)

```bash
cd pi-durable-news-agent/apps/dna-server-api
NODE_NO_WARNINGS=1 npx tsx --test tests/vio-config.test.ts
```

Expect 4 pass: the config seeds 15 topics, all 14 sources fetch through fixtures, the jev commands and prompts load with their variables, and a faux sweep presents the VIO paper cards while dropping the hype and sourdough fixtures.

## 2. Full free suite (about 2 min)

```bash
cd pi-durable-news-agent
just test unit        # types, lint, format check, every workspace's tests
just test faux        # faux sweep, crash recovery, auth, stream
```

Expect on Node 24: everything passes. On Node 22 expect exactly the two SSE failures listed above and nothing else. A different failure is new, so look at it.

Server tests only: `cd apps/dna-server-api && NODE_NO_WARNINGS=1 npx tsx --test tests/*.test.ts` gives 109 pass, 1 skipped.

## 3. Offline demo in the browser (free)

```bash
just combos dev       # faux model, fixture feeds, UI on http://localhost:4851
```

Open the UI and trigger a sweep (`just cron tick` in a second terminal). Expect cards titled `[fixture] ...` about visual-inertial odometry, event cameras and GNSS-denied navigation. You should **not** see the sourdough item or the "Revolutionary drift-free" item. Try Show more / Show less on a card and watch the topic weight move. Optionally run `just test ui` (needs Chrome).

## 4. Live source check (free, needs internet, no model calls)

```bash
cp .env.example .env     # add OPENROUTER_API_KEY, leave OPENAI_API_KEY empty
just api tokens
just api sources-check
```

This fetches each source once and prints a status table. Read it like this:

| Row | Good | Act on |
|---|---|---|
| 5 `arXiv:` rows | `200 N entries` | `Not an RSS or Atom document`: arXiv returned an error page, wait and retry (it throttles) or loosen the query. `0 entries` over 24 h is normal on a quiet day |
| `OpenVINS`, `ORB-SLAM3`, `PX4`, `Isaac ROS` releases | `200`, 0 entries is fine | `404`: the repo or feed name is wrong, fix the URL |
| `VINS-Fusion commits` | `200` | Noisy later? Remove it |
| `PX4 forum`, `Hugging Face Papers` | `200` | `403`: skipped for one sweep, not fatal |
| `Hacker News search` | `200` | Its count uses a leftover "durable agents" query, ignore it |

## 5. First live sweep (real spend)

Upstream measured about $0.32 for a first sweep, because every source is new. VIO sources are fewer, so expect less, but check your OpenRouter dashboard.

```bash
just combos local          # API + UI on http://localhost:4851, then set the schedule to 60 min in the top bar
just cron tick             # or wait for the tick
just cli run doctor        # keys, API, scopes, cron, search engine health
just cli run status
just cli run feed
```

Acceptance checklist for the first sweep:

1. The feed shows papers and repo releases about VIO or UAV state estimation, and **no AI-agent news**.
2. Paper cards put a dataset and metric next to every number, and say whether code is released.
3. Loud, thin items appear as `hype_watch` or score high on Hype. Papers with code and EuRoC or TUM-VI numbers score high on Facts.
4. No generated images were billed (the OpenAI key is empty).
5. Executions view: the audit is clean, and cost per sweep is what you expect.

## 6. Tuning after a few days

- Label about ten cards Hype, Facts or Signal. Your labels become examples in later jev decisions.
- Too much noise: raise `relevance_min` (0.45) or `worth_min` (0.35) in the matching `command.json`. Too little: lower them. Raise the command's `version` when you edit it.
- Adjust topic weights with the table in `README.md`.
- Edit the **Reader profile** block in `agents/news-desk/SYSTEM_PROMPT.md` (template in `docs/research-profile.template.md`).

## 7. Resetting

Keywords and sources are seeded once. After editing them, delete `pi-durable-news-agent/data/` (or the folder in `DNA_DATA_DIR`) and restart. To try another topic set without touching the repo, start with `DNA_CONFIG_DIR=<folder>`.

## 8. Ideas for the not-built items

Citation alerts, a dedicated `arxiv` fetcher keyed on the arXiv id, and a `paper` card are specified or described in `README.md` and `docs/paper-card-spec.md`. Each should land with a test beside `tests/vio-config.test.ts` and, for the card, a fixture entry in `arxiv.atom.xml`.

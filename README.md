# VIO for UAV: starter kit for pi-durable-news-agent

A drop-in configuration for [disler/pi-durable-news-agent](https://github.com/disler/pi-durable-news-agent) that retargets it from "AI agent news" to **visual-inertial odometry (VIO) research for UAVs**: papers, code releases, datasets, tools and deadlines, scored as Hype / Facts / Signal.

It changes configuration and prompts, plus a small amount of test and fixture support (an arXiv-style fixture, an optional `DNA_CONFIG_DIR` setting, and tests pinned to a frozen copy of upstream's config) so the repo's own test suite stays green.

## What is inside

```
vio-uav-kit/
├── README.md                          this file
├── docs/
│   ├── field-reference.md             every field you can edit, what is required, what must not change
│   ├── paper-card-spec.md             required fields for a future "paper" card (needs code, see file)
│   └── research-profile.template.md   fill-in sheet that describes your own work
└── overlay/apps/                      mirrors the repo layout, copy it over the repo
  dna-client-browser/fe/           bright UI theme (index.html, src/styles/tokens.css, app.css)
  dna-server-api/
    ├── config/
    │   ├── keywords.json              15 topics + hype / facts / signal hint words
    │   └── sources.json               14 sources (5 arXiv queries, 5 GitHub feeds, HN, HF Papers, PX4 forum)
    └── prompt_engineering/
        ├── jev/{relevance,worth-attention,importance,hfs,same-story}/command.json
        └── agents/{news-desk,news-researcher,deep-research}/SYSTEM_PROMPT.md
```

## Apply it

```bash
git clone https://github.com/disler/pi-durable-news-agent && cd pi-durable-news-agent
git checkout -b vio                                   # keep upstream intact, see "Known caveats"
cp -r /path/to/vio-uav-kit/overlay/. .                # overwrites 18 files and adds 4, review with git diff
just install && cp .env.example .env                 # add OPENROUTER_API_KEY, leave OPENAI_API_KEY empty (needs zsh, see "Run it locally")
just api tokens
just api sources-check                                # fetches every source once, live, prints a status table
just combos local                                     # then set the schedule to 60 min in the top bar
```

Three details that matter:

1. **Seeding runs once.** `keywords.json` and `sources.json` are read only when the database is first created. On a fresh clone that is automatic. If you already ran the agent, delete `data/` (or your `DNA_DATA_DIR`) first, or change keywords in the app or with `dna keywords add|weight|off|rm`. Sources you add to `sources.json` later are picked up once on the next start. Sources already in the database stay until you remove them in the app.
2. **Weights are not in the JSON.** `keywords.json` holds plain strings. Per-topic weights (0.1 to 2.0, default 1.0) live in the database. Suggested starting points are below.
3. **Leave `OPENAI_API_KEY` empty.** arXiv entries have no image, so with a key set the agent generates one per card (about $0.005 each).

## Run it locally

Run everything from the cloned repo folder (`pi-durable-news-agent/`, with the overlay applied and `.env` filled in).

**Prerequisites**

- Node 24 (`nvm install 24 && nvm use 24`). Node 22 runs the app but fails two SSE streaming tests.
- `just` and `zsh`. The recipes call `zsh -cu`, but you never have to use zsh as your terminal: `sudo apt install zsh` (Ubuntu) or `brew install zsh just` (macOS) is enough. If you cannot install zsh, run `just --shell bash --shell-arg -cu <recipe>`, which works for single recipes but not for recipes that call `just` again, such as `combos dev`.

**Start and stop**

| Goal | Command |
|---|---|
| Start the API (port 4850) and the UI (port 4851) in the background | `just net up local` |
| Check what is running | `just net status local` |
| Open the UI | http://localhost:4851 |
| Stop both, and remove the crontab line | `just net down local` |

`just net up local` is safe to repeat. After a reboot, run it again: the API is a plain background process and does not restart by itself.

**Use it**

| Goal | Command |
|---|---|
| Run one sweep now | `just cron tick` |
| List the cards, or open one | `just cli run feed`, `just cli run card 1` |
| Keys, API, scopes and search health | `just cli run doctor` |
| Status, schedule and cost | `just cli run status` |
| Label a card | `just cli run label 1 signal` (or `hype`, `facts`) |
| More or less like a card | `just cli run more 1`, `just cli run less 1` |
| Free offline demo with a fake model and fixture feeds (stop the real API first) | `just combos dev` |
| Tests | `just test unit` |

A sweep costs roughly $0.01 to $0.02 with the default Haiku model and no image key.

**Run it weekly: Fridays at 09:00 and never otherwise**

1. Set the tick in `.env`: `DNA_CRON_SCHEDULE="0 9 * * 5"` (minute, hour, day of month, month, day of week; 5 is Friday, in the machine's local time).
2. Install the crontab line: `just net cron local install`. Check it with `just net cron local status`, remove it with `just net cron local uninstall`.
3. Make sure the schedule in the app's top bar (or `just cli run schedule 60`) is **60 minutes, not Off**. The cron tick only asks the API to sweep, and the API sweeps only when its own schedule says one is due. With an hourly tick the only choices are 60 minutes or Off.
4. Keep the API running (`just net up local`) at that time, otherwise the tick finds nothing and that week is skipped.

`just cli run status` shows "next sweep" as the next hour, which is wrong for a weekly tick. The next real sweep is the next Friday 09:00.

## Look and feel

The UI is bright by default (white panels, a soft blue-gray page, vivid pink as the accent, green for Facts and amber for Hype, all with readable contrast on white). Every color comes from the tokens at the top of `fe/src/styles/tokens.css`, so recoloring is a one-file edit. The original dark look is kept: in the browser console run `document.documentElement.dataset.theme = "dark"` to try it, or set `data-theme="dark"` on `<html>` in `fe/index.html` to make it the default. After editing styles, rebuild with `npm run build -w dna-client-browser`; `just net up local` serves the built files.

## Suggested topic weights (starting guesses)

Set in the app, or `dna keywords weight <id> <w>` (`dna keywords list` shows ids).

| Topic | Weight | Topic | Weight |
|---|---|---|---|
| visual-inertial odometry | 1.5 | filter-based VIO | 1.0 |
| UAV state estimation | 1.5 | camera-IMU calibration | 1.0 |
| visual-inertial SLAM | 1.2 | VIO robustness | 1.1 |
| event camera odometry | 1.2 | visual-inertial dataset | 1.1 |
| learned visual odometry | 1.0 | IMU preintegration | 0.9 |
| learned inertial odometry | 1.0 | PX4 visual odometry | 0.8 |
| GNSS-denied navigation | 1.0 | LiDAR-visual-inertial fusion | 0.7 |
| | | neural SLAM | 0.6 |

## What changed from upstream

| File | Change |
|---|---|
| `config/keywords.json` | New topic list and domain hint words (EuRoC, TUM-VI, "drift-free", "outperforms OpenVINS", ...) |
| `config/sources.json` | Replaced the 28 AI-news sources with 14 research sources |
| `jev/relevance`, `worth-attention`, `importance` | "AI agent engineer" replaced by "researcher developing VIO for UAVs" |
| `jev/hfs` | Hype / Facts / Signal redefined for research (see below) |
| `jev/same-story` | A preprint's later versions, its repo and its discussion threads count as one story |
| `agents/news-desk` | New purpose, a **Reader profile** block for you to edit, rules for writing paper / release / deadline cards |
| `agents/news-researcher` | Extracts research claims (sensors, datasets with metrics, baselines, real flight, code) and defines actionability for a researcher |
| `dna-client-browser/fe` (styles, `index.html`) | Bright theme as the default; the dark palette stays under `data-theme="dark"`. Colors that were hard-coded in `app.css` now come from tokens |
| `agents/deep-research` | Prefers papers, repos and dataset pages and reports venue, datasets, metrics and baselines |

Each changed jev command has its `version` raised by one. Everything else is identical to upstream: template variables, question ids and types, score level counts, policies and thresholds.

**Hype / Facts / Signal for research**

- **Hype**: no benchmark numbers, demo-video-only results, state-of-the-art against weak baselines, cherry-picked sequences, press or funding coverage of a paper.
- **Facts**: primary source (paper, repo, release notes, dataset page) with datasets, metrics, baselines. Top level: released code, public-dataset numbers, ablations or real flight results.
- **Signal**: a method with code you can run against your baseline, a new dataset or benchmark, a breaking change in a tool you use, a deadline.

## Sources

| Source | Kind | Poll | Weight |
|---|---|---|---|
| arXiv: visual-inertial odometry | atom | 6 h | 1.5 |
| arXiv: UAV state estimation | atom | 6 h | 1.4 |
| arXiv: event-based odometry | atom | 6 h | 1.2 |
| arXiv: learned VIO and inertial odometry | atom | 6 h | 1.0 |
| arXiv: GNSS-denied aerial navigation | atom | 6 h | 1.0 |
| OpenVINS releases | github_releases | 6 h | 1.5 |
| ORB-SLAM3 releases | github_releases | 6 h | 1.2 |
| VINS-Fusion commits | github_releases | 6 h | 1.0 |
| PX4 Autopilot releases | github_releases | 6 h | 0.8 |
| Isaac ROS Visual SLAM releases | github_releases | 6 h | 0.8 |
| Hugging Face Papers | web_page | 6 h | 0.6 |
| PX4 forum | rss | 2 h | 0.8 |
| Hacker News front page / search | hn_front / hn_search | 1 h | 0.5 / 1.0 |

**Live check, 2026-10-28:** every arXiv query, GitHub feed, the PX4 forum and Hugging Face Papers fetched with a 200 and parsed. Over a 14-day window the arXiv feeds returned 12, 3, 1, 1 and 2 entries, so the sweep's 14-day age window is not starving them. The GitHub feeds are valid but quiet: OpenVINS's last release is from 2023, ORB-SLAM3's from 2021, VINS-Fusion's last commit from 2021, PX4 and Isaac ROS had their last release in September 2026, so expect few repo cards. VINS-Fusion is effectively dormant, consider removing it. The two Hacker News sources got 403 from the test machine and were not verified; run `just api sources-check` on your own network. `sources-check` only looks at a 24 h window, so 0 entries there is normal. A repo with no releases returns an empty feed, and a wrong URL is disabled after three failures in a row. The `hn_search` line of that check uses a leftover "durable agents" query, so ignore its entry count.

Not included on purpose: Reddit (upstream notes it often answers 403 to servers), IEEE Xplore and other publisher feeds (URLs differ per journal, add yours), and citation alerts (OpenAlex and Semantic Scholar return JSON, which needs a new fetcher).

## Known caveats

- **Tests and the offline demo.** Upstream's tests assert on its own topics and sources, so they now run against a frozen copy in `tests/config-upstream/` (the test server gets it through `DNA_CONFIG_DIR`). `tests/vio-config.test.ts` covers this kit's config, and `fixtures/news/arxiv.atom.xml` (synthetic) lets `just combos dev` show VIO items offline. See `TESTING.md` for how to run and read all of it.
- **What was verified:** the server suite passes (109 pass, 0 fail, 1 live-network test skipped), `tsc` and `oxlint` pass, and the formatter check passes on every changed file. Two SSE streaming tests fail on this machine identically on pristine upstream (Node 22 here, the repo requires Node 24). The browser UI suite, the TUI smoke and every live-network check have not been run.
- **The Reader profile only steers the desk agent.** The jev judges (relevance, worth, Hype / Facts / Signal) see topics and your labeled examples, not the system prompt. Making them profile-aware needs a small code change where the jev state is built (`src/news/hfs.ts` and the judge).
- **Thresholds are upstream's.** `relevance_min` 0.45, `worth_min` 0.35, `label_threshold` 50. arXiv volume differs from news volume, so tune them after a week of use.
- **Judged on abstracts.** The arXiv feed carries the abstract only, so Facts scores come from the abstract unless the researcher agent fetches the `arxiv.org/html` page. I saw no PDF handling.
- **Age window.** Anything older than 14 days is dropped (`MAX_AGE_DAYS` in `src/news/sweep-task.ts`), so a paper whose code appears later may be missed.
- **All 15 topics are searched each sweep** (`DNA_SWEEP_QUERIES` defaults to 15) through Bing and Google News, which returns mostly press. Lower that number in `.env` to rotate through topics, or give press-heavy topics a low weight.

## First-week routine

1. Open the feed and label about ten cards Hype, Facts or Signal. Your recent labels become examples in later jev decisions.
2. Use Show more / Show less on topics and sources to move weights.
3. Fill in `docs/research-profile.template.md`, then condense it into the **Reader profile** block of `agents/news-desk/SYSTEM_PROMPT.md`. Keep `{{` out of it.
4. Read `docs/field-reference.md` before editing JSON or prompts.

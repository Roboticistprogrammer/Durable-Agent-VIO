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
└── overlay/apps/dna-server-api/       mirrors the repo layout, copy it over the repo
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
cp -r /path/to/vio-uav-kit/overlay/. .                # overwrites 15 files and adds 4, review with git diff
just install && cp .env.example .env                 # add OPENROUTER_API_KEY, leave OPENAI_API_KEY empty
just api tokens
just api sources-check                                # fetches every source once, live, prints a status table
just combos local                                     # then set the schedule to 60 min in the top bar
```

Three details that matter:

1. **Seeding runs once.** `keywords.json` and `sources.json` are read only when the database is first created. On a fresh clone that is automatic. If you already ran the agent, delete `data/` (or your `DNA_DATA_DIR`) first, or change keywords in the app or with `dna keywords add|weight|off|rm`. Sources you add to `sources.json` later are picked up once on the next start. Sources already in the database stay until you remove them in the app.
2. **Weights are not in the JSON.** `keywords.json` holds plain strings. Per-topic weights (0.1 to 2.0, default 1.0) live in the database. Suggested starting points are below.
3. **Leave `OPENAI_API_KEY` empty.** arXiv entries have no image, so with a key set the agent generates one per card (about $0.005 each).

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

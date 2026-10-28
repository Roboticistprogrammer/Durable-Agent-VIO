# Field reference

What you can edit, which fields are required, and what must stay as it is. Paths are relative to `apps/dna-server-api/` in the upstream repo.

## 1. `config/keywords.json`

```json
{ "topic": [...], "hype": [...], "facts": [...], "signal": [...] }
```

| Field | Required | Meaning |
|---|---|---|
| `topic` | yes | What you follow. Each topic is also used as a **search query** (Bing News, Google News, Hacker News) and as a **choice** in the relevance judge (`matched_topic`). |
| `hype`, `facts`, `signal` | yes | Hint words passed to the Hype / Facts / Signal judge as `section_keywords`. Not filters. |

Rules:

- Four keys, each a list of unique, non-empty strings. No weights, objects or comments in this file.
- Write topics as short search phrases (2 to 4 words). Long sentences search badly and make a poor choice label.
- About 15 topics matches the default of 15 searches per sweep. More topics means a weighted draw each sweep.
- Seeded once, when the database is created. Afterwards change keywords in the app or with `dna keywords`. To keep several topic sets, put each in its own folder and start the server with `DNA_CONFIG_DIR=<folder>` (it needs `keywords.json` and `sources.json`).
- Weights (0.1 to 2.0, default 1.0) are stored in the database and moved by Show more / Show less.

## 2. `config/sources.json`

```json
{ "sources": [ { "kind": "...", "name": "...", "url": "...", "interval_min": 360, "weight": 1.0 } ] }
```

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | One of `rss`, `atom`, `github_releases`, `web_page`, `hn_front`, `hn_search`. Anything else is a new fetcher (code). |
| `name` | yes | Shown in the app. Keep it unique. |
| `url` | for `rss`, `atom`, `github_releases`, `web_page` | `https` URL. Ignored by `hn_front` and `hn_search`. |
| `interval_min` | no, default 15 | Minutes between fetches. A source whose content did not change is skipped cheaply, so short intervals cost little. arXiv posts once a day, so 360 is plenty. |
| `weight` | no, default 1 | Multiplies the item's rank. 0.1 to 2.0 is the useful range. |
| `query` | no | Stored but not used by any fetcher in this kit. Leave it out. |

Other fields are ignored.

| Kind | Fetches | Notes |
|---|---|---|
| `rss`, `atom` | One feed. Both use the same parser. | arXiv's API returns Atom, so it uses `atom`. |
| `github_releases` | A GitHub Atom feed, with the repo name added to titles | Works for `.../releases.atom` and `.../commits/<branch>.atom`. Use releases for repos that tag releases, commits for those that do not (noisy). |
| `web_page` | Article links on a listing page | Only links on the same host under the page's own path. Titles of 12+ characters. |
| `hn_front` | Hacker News front page | |
| `hn_search` | Hacker News search for your `topic` keywords, last 7 days, 3+ points | |

A 403 or 429 skips a source for one sweep. Any other error counts as a failure, and three in a row disable it.

### arXiv query cheat sheet

URL form: `https://export.arxiv.org/api/query?search_query=<URL-encoded query>&sortBy=submittedDate&sortOrder=descending&max_results=50`

| Syntax | Example |
|---|---|
| Field prefixes: `abs:` abstract, `ti:` title, `au:` author, `cat:` category, `all:` everything | `ti:"visual-inertial"` |
| Phrase | `abs:"event camera"` |
| Boolean: `AND`, `OR`, `ANDNOT` (parenthesize groups) | `(abs:UAV OR abs:drone) ANDNOT abs:survey` |
| Useful categories | `cs.RO` robotics, `cs.CV` vision, `eess.SY` systems and control, `cs.LG` learning |

Keep requests infrequent (arXiv asks for no more than one every three seconds). To watch a specific group, add `au:"Surname_F"` queries as extra sources.

## 3. `prompt_engineering/jev/<name>/command.json`

| Field | Required | Edit? |
|---|---|---|
| `name` | yes | **Never.** Must equal the folder name. |
| `version` | yes, integer 1 or more | Raise it when you change the prompt. Logged with each call. |
| `description` | yes | Free text. |
| `model` | no | Leave as is. |
| `state` | yes | **Never rename or remove** the `{{...}}` placeholders. The code fills exactly these. |
| `questions` | yes | Edit `instructions` and the wording of `criteria`. **Never change** the question ids, `type`, or the number of levels in a `score` list. |
| `policy` | yes | Thresholds. Edit freely, see below. |
| `each` | claim-support only | Leave. |

Question types: `score` (a list of ordered levels, reduced to 0 to 1), `noul` (yes/no with a `true` and a `false` description), `choice` (named options, `matched_topic` is built from your topics).

| Command | Used for | Outputs | Thresholds in `policy` |
|---|---|---|---|
| `relevance` | Gate: is it about your topics, and which one | `relevance`, `matched_topic` | `relevance_min` 0.45 |
| `worth-attention` | Gate: is it worth reading today | `worth`, `novelty` | `worth_min` 0.35 |
| `importance` | Ranks gated items to pick the top N | `importance` | none |
| `hfs` | Hype / Facts / Signal before a card is shown | `hype`, `facts`, `signal` | `label_threshold` 50, `attention` weights (signal 0.5, facts 0.35, hype -0.25, relevance 0.4) |
| `same-story` | Merges repeated coverage into one story | `same`, `development`, `covered`, `addition`, `sufficient` | `same` 0.85, `yes` 0.85, `no` 0.2, `sufficient` 0.8, `history_days` 14, `shortlist` 12 |
| `claim-support` | Checks the researcher's claims against the text | `supported` | `supported_min` 0.7, `review_band` [0.4, 0.7] |

Too much noise: raise `relevance_min` or `worth_min`. Too little: lower them. Change one at a time.

## 4. `prompt_engineering/agents/*/SYSTEM_PROMPT.md`

| File | Template variables you must keep |
|---|---|
| `news-desk` | `{{device_name}}`, `{{search_mode}}`, `{{component_catalog}}` |
| `news-researcher` | none |
| `deep-research` | `{{web_access}}` |

A `{{name}}` the code does not supply makes the prompt loader throw, so never write `{{` in notes, examples or your Reader profile. Keep the **UI text rules** and **Tools** sections of the desk prompt: the tool list must match the tools the server registers.

## 5. What the agents must produce

### Researcher: `report_findings` (one call per item)

| Field | Required | Limit |
|---|---|---|
| `item_id` | yes | integer, an id the desk gave |
| `summary` | yes | 10 to 600 characters |
| `claims` | yes (may be empty) | at most 4 strings |
| `evidence_urls` | yes (may be empty) | at most 6 |
| `actionability` | yes | `high`, `medium`, `low` or `none` |

### Desk: `present_news` card components (existing)

| Component | Required props | Rule |
|---|---|---|
| `headline` | title, dek | attention 70 or more |
| `brief` | title, summary | none, the default |
| `signal_alert` | title, action, why | signal 60 or more |
| `fact_check` | claim, verdict, evidence | an hfs classification exists |
| `hype_watch` | title, reality_check | hype 40 or more |
| `release` | name, version, changes | none |
| `thread_pulse` | title, takes | the item has a discussion link |
| `quote` | quote, speaker | none |

Every card needs a title of 12 words or fewer. A new component such as `paper` needs code, see `paper-card-spec.md`.

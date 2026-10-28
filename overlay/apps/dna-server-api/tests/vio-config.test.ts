// The VIO-for-UAV config this fork ships (config/, prompt_engineering/), exercised on fixtures. The engine tests run
// on a frozen copy of upstream's config (tests/config-upstream) so they do not depend on these topics.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadCommand, listCommands } from "@dna/jev";
import { openStore } from "../src/db/store.ts";
import { fixtureHttp } from "../src/news/fixtures.ts";
import { fetchSource } from "../src/news/sources/index.ts";
import { startNewsSweep } from "../src/news/sweep.ts";
import { PROMPTS_DIR, VIO_CONFIG_DIR, fauxApp, waitForSweep } from "./helpers.ts";

const withStore = async (fn: (store: ReturnType<typeof openStore>) => Promise<void> | void) => {
  const dir = mkdtempSync(join(tmpdir(), "dna-vio-"));
  const store = openStore(dir, VIO_CONFIG_DIR);
  try {
    await fn(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
};

test("the VIO config seeds 15 topics and the hype, facts and signal hint words", () =>
  withStore((store) => {
    const by = (kind: string) => store.taste.keywords(kind as "topic").map((k) => k.term);
    assert.equal(by("topic").length, 15);
    assert.ok(by("topic").includes("visual-inertial odometry"));
    assert.ok(by("facts").includes("EuRoC"));
    assert.ok(by("signal").includes("code released"));
    assert.ok(by("hype").includes("drift-free"));
    assert.ok(
      store.taste.keywords("topic").every((k) => k.weight === 1),
      "weights are not in keywords.json: every topic starts at 1",
    );
  }));

test("the VIO sources are valid and every one fetches through fixtures", () =>
  withStore(async (store) => {
    const sources = store.sources.list();
    assert.equal(sources.length, 14);
    assert.equal(sources.filter((s) => s.url.includes("export.arxiv.org")).length, 5);
    const http = fixtureHttp("news");
    const results = [];
    for (const source of sources)
      results.push(
        await fetchSource(source, {
          http,
          store,
          since: new Date(Date.now() - 3_600_000),
          queries: ["visual-inertial odometry"],
        }),
      );
    assert.ok(
      results.every((r) => r.ok),
      JSON.stringify(results.filter((r) => !r.ok).map((r) => [r.source.name, r.error])),
    );
    const arxiv = results.find((r) => r.source.name === "arXiv: visual-inertial odometry")!;
    assert.equal(arxiv.docs.length, 5);
    assert.ok(arxiv.docs.every((d) => /^https?:\/\/arxiv\.org\/abs\/9999\.\d+v1$/.test(d.url)));
    assert.ok(
      arxiv.docs.every((d) => d.publishedAt),
      "arXiv entries carry a published date",
    );
  }));

test("every changed jev command loads, and the research prompts keep their variables", () => {
  const dir = join(PROMPTS_DIR, "jev");
  for (const name of listCommands(dir)) {
    const cmd = loadCommand(name, dir);
    assert.equal(cmd.name, name);
  }
  const desk = readFileSync(join(PROMPTS_DIR, "agents/news-desk/SYSTEM_PROMPT.md"), "utf8");
  for (const v of ["device_name", "search_mode", "component_catalog"])
    assert.ok(desk.includes(`{{${v}}}`), `news-desk keeps {{${v}}}`);
  assert.match(desk, /## Reader profile/);
  assert.match(desk, /visual-inertial odometry/);
  const deep = readFileSync(join(PROMPTS_DIR, "agents/deep-research/SYSTEM_PROMPT.md"), "utf8");
  assert.ok(deep.includes("{{web_access}}"));
});

test("a faux sweep on the VIO config presents relevant papers, drops hype and off-topic items, and the audit is clean", async () => {
  const { app, cleanup } = await fauxApp({ DNA_FIXTURE_SET: "news" }, VIO_CONFIG_DIR);
  try {
    const started = await startNewsSweep(app, app.main, app.ctx, {
      trigger: "test",
      requestId: "vio:1",
    });
    assert.equal(started.status, "accepted");
    const sweep = await waitForSweep(app, started.sweep!.id);
    assert.equal(sweep.status, "completed");
    assert.deepEqual(sweep.audit?.missing, []);
    assert.ok(sweep.kept < sweep.gathered, "jev rejected something");

    const titles = app.store.news.cards().map((c) => c.title);
    assert.ok(titles.length >= 1, "at least one card");
    assert.ok(
      titles.some((t) => /odometry|visual-inertial|GNSS/i.test(t)),
      `a VIO paper is presented: ${titles.join(" | ")}`,
    );
    assert.ok(!titles.some((t) => /sourdough/i.test(t)), "off-topic stays out");
    assert.ok(!titles.some((t) => /Revolutionary drift-free/i.test(t)), "pure hype stays out");
  } finally {
    await cleanup();
  }
});

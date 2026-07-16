# Automation agents

Scripts that back the content pipeline (keyword research → draft → images →
QA → human approval → publish). Agents 1-4 exist; human approval and
auto-publish are handled by hand-editing `draft: false` + `git push`
(GitHub Actions deploys automatically) rather than a separate agent.

## Running the whole thing: `npm run pipeline`

```
npm run pipeline                       # research + draft candidate 0 + images + QA
npm run pipeline -- --index 3          # draft a different keyword candidate
npm run pipeline -- --skip-research    # reuse the latest data/keywords/*.json
```

Runs Agents 1-4 in order for one new post, threading the slug Agent 2
produces into Agents 3 and 4 automatically. If image generation fails it
logs a warning and continues (a flaky free image API shouldn't block a
draft from being reviewable); if Agent 1 or 2 fails, the pipeline stops
there since nothing downstream has anything to work with. Ends by printing
the post path, QA status, and the manual steps left (fill placeholders,
verify `[SOURCE NEEDED]` claims, flip `draft: false`, commit, push).

## Daily automation: `.github/workflows/daily-draft.yml`

Runs `npm run pipeline` on a schedule (01:00 UTC = 10:00 KST) using the
`ANTHROPIC_API_KEY` repo secret, and — if a new draft was produced — opens
a pull request with it (branch `draft/<date>-<run>`) instead of pushing
straight to `master`. **The post stays `draft: true` and does not go live
on its own.** Deliberately no auto-publish step: this is the same
human-review gate the pipeline already enforces locally, just triggered on
a schedule instead of by hand. The 2026 Google spam updates specifically
targeted scaled, unreviewed AI content, which is what this gate exists to
avoid — see the human-review step in `pipeline.mjs`'s own comments.

Reviewing a generated PR: edit the file directly in the PR (GitHub's web
editor works fine from a phone), fill in `[EXPERIENCE: ...]` placeholders
(or rewrite them as general-pattern statements if there's no first-hand
experience — never fabricate an anecdote), verify `[SOURCE NEEDED]`
claims, then approve via Telegram (see below) or flip `draft: false` and
merge manually. Merging triggers `deploy.yml` and publishes it.

Trigger a run manually (e.g. to test) with:
```
gh workflow run daily-draft.yml --repo noonggop01/ai-pickle
```

## Telegram approval: `.github/workflows/telegram-approve.yml`

After `daily-draft.yml` opens a PR, `notify-telegram.mjs` sends a message
with the title, category, QA summary, a count of remaining
`[EXPERIENCE]`/`[SOURCE NEEDED]` markers, the PR link, and an
"✅ Approve & Publish" inline button.

A separate poller workflow checks Telegram every 5 minutes
(`telegram-approve-poller.mjs`) for that button being tapped. When it is:
1. It re-scans the PR's post file(s) for unresolved `[EXPERIENCE:` /
   `[SOURCE NEEDED]` markers. **If any remain, it refuses to publish** and
   replies in Telegram explaining what's still unresolved — editing still
   has to happen in the PR itself, this is a safety check, not an editor.
2. If clean, it flips `draft: false` if needed, commits, and merges the PR
   (which triggers `deploy.yml`).
3. It replies with the live URL.

This needs three repo secrets: `TELEGRAM_BOT_TOKEN` (from @BotFather),
`TELEGRAM_CHAT_ID` (the numeric chat id from a `getUpdates` call after
messaging the bot once), and the existing `ANTHROPIC_API_KEY`. Telegram
itself tracks which updates have been delivered per bot token — the
poller confirms each batch it processes, so no offset/state needs to be
stored in the repo.

## Agent 1 — Keyword Research

```
npm run research:keywords
```

Pulls trending-topic signals from **free, public sources** and writes the
top 10 candidates to `data/keywords/<date>.json` (also printed to stdout).
Each candidate matches the input shape Agent 2 (draft writer) expects:
`{ keyword, search_intent, niche_context, signal_score, sources, reference_url }`.

**Sources used today:**
- Google Trends realtime feed (US) — general trending searches, filtered to AI-related terms
- Hacker News (Algolia API) — searched across specific tool names (ChatGPT, Claude, Gemini, Midjourney, Copilot, etc.) rather than a generic "AI" query, since that surfaces review/comparison-worthy stories instead of generic AI news

**Known limitations:**
- No real search volume or CPC data — that requires a paid tool (DataForSEO,
  SerpAPI, Google Keyword Planner). This agent finds *what's trending right
  now*, not *what has proven search demand*. Worth adding once there's
  budget for it.
- Reddit is not used. Its public JSON endpoints now return 403 for most
  non-browser traffic (including CI/datacenter IPs) regardless of
  `User-Agent`. `fetchReddit()` still exists in `lib/sources.mjs` for a
  future upgrade to Reddit's free OAuth "script app" credentials.
- `keyword` values are topic seeds (often HN story titles), not literal
  search phrases — Agent 2 is expected to turn them into an actual
  SEO-friendly title/angle, not use them verbatim.

## Agent 2 — Draft Writer

```
npm run write:draft [-- --index N | --file path/to/candidate.json]
```

Requires `ANTHROPIC_API_KEY` (copy `.env.example` to `.env` and fill it in).
Takes one candidate from the latest `data/keywords/*.json` (or a specific
file), calls Claude with a forced tool call for reliable structured output,
and writes `src/content/blog/<slug>.md` with `draft: true` plus a
`<slug>.images.json` sidecar for Agent 3. Nothing is published until a
human fills in the `[EXPERIENCE: ...]` placeholders and flips the flag.

## Agent 3 — Images

```
npm run make:images [-- --slug post-slug]
```

Reads `<slug>.images.json` (falls back to hero-image-only from the title if
it's missing), generates images via [Pollinations.ai](https://pollinations.ai)
(free, no API key), saves them to `public/images/blog/<slug>/`, sets
`heroImage` in the frontmatter, and inserts inline images into the body near
their suggested placement (best-effort heading match — if it can't find a
good spot, the image is still saved and it prints where to add it manually).

Without `--slug`, it targets whichever post in `src/content/blog/` was
modified most recently.

**Known limitation:** inline image paths are written with the `/ai-pickle`
base path baked in literally (Markdown body text isn't rewritten by Astro at
build time the way frontmatter fields are). If the site ever moves off that
base path, existing posts' inline images will need a find-and-replace.

## Agent 4 — Automated QA

```
npm run qa:check [-- --slug post-slug | --all]
```

Runs an independent checklist against draft posts (word count, heading
structure, banned AI-tell phrases, `[EXPERIENCE: ...]` / `[SOURCE NEEDED]`
placeholder inventory, meta field lengths, and a title-overlap check against
other posts) so the human reviewer only has to look at what's flagged.
Writes a report to `<slug>.qa.json` (gitignored — cheap to regenerate,
no network calls) and prints a pass/warn/fail summary per check.

By default it checks every post still marked `draft: true`. Exits with a
non-zero code if any post has a hard failure (banned phrase, missing
headings, under the word-count floor, or bad meta fields) — warnings
(like unresolved `[SOURCE NEEDED]` tags) don't block, they're just
surfaced for review.

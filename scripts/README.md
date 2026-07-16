# Automation agents

Scripts that back the content pipeline (keyword research → draft → images →
QA → human approval → publish). Only Agent 1 exists so far.

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

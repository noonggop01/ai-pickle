#!/usr/bin/env node
// Agent 1 — Keyword Research
//
// Pulls "what's hot right now" signals from free public sources (no paid
// keyword API), scores and merges them, and writes the top candidates as
// JSON that Agent 2 (draft writer) can consume directly.
//
// This does NOT give real search volume/CPC — that requires a paid tool
// (DataForSEO, SerpAPI, Google Keyword Planner). It's a trend-detection
// pass to find topics worth writing about right now.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchGoogleTrends, fetchHackerNewsForQueries } from '../lib/sources.mjs';

const NICHE_TERMS = [
  'ai', 'artificial intelligence', 'chatgpt', 'claude', 'gemini', 'copilot',
  'openai', 'anthropic', 'llm', 'gpt', 'midjourney', 'stable diffusion',
  'sora', 'runway', 'perplexity', 'notebooklm', 'chatbot', 'machine learning',
  'automation', 'prompt', 'ai agent', 'ai tool', 'ai app',
];

// Specific tool names surface review/comparison-worthy stories far better
// than a single broad "AI" query, which mostly returns AI news/opinion pieces.
const HN_QUERIES = [
  'ChatGPT', 'Claude AI', 'Gemini AI', 'Midjourney', 'GitHub Copilot',
  'Perplexity AI', 'NotebookLM', 'AI agent', 'AI coding tool',
];

const TOP_N = 10;

function matchesNiche(title) {
  const lower = title.toLowerCase();
  return NICHE_TERMS.some((term) => lower.includes(term));
}

function normalizeKey(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessSearchIntent(title) {
  const lower = title.toLowerCase();
  if (lower.includes(' vs ') || lower.includes(' vs.')) return 'comparison';
  if (lower.startsWith('how to') || lower.includes('how to')) return 'how_to';
  if (lower.includes('review') || lower.includes('worth it')) return 'review';
  if (lower.includes('best ') || lower.includes('top ')) return 'roundup';
  return 'explainer';
}

function scoreByRank(items, maxScore = 100, step = 6) {
  return items.map((item) => ({
    ...item,
    score: Math.max(0, maxScore - (item.rank - 1) * step),
  }));
}

function scoreByPoints(items) {
  const max = Math.max(1, ...items.map((i) => i.points ?? 0));
  return items.map((item) => ({
    ...item,
    score: Math.round(((item.points ?? 0) / max) * 100),
  }));
}

async function main() {
  console.error('Fetching signals from Google Trends and Hacker News...');

  const [trendsRaw, hnRaw] = await Promise.all([
    fetchGoogleTrends('US').catch((err) => {
      console.error('[google-trends] failed:', err.message);
      return [];
    }),
    fetchHackerNewsForQueries(HN_QUERIES).catch((err) => {
      console.error('[hacker-news] failed:', err.message);
      return [];
    }),
  ]);

  const trends = scoreByRank(trendsRaw.filter((i) => matchesNiche(i.title)));
  const hn = scoreByPoints(hnRaw.filter((i) => matchesNiche(i.title)));

  const merged = new Map();

  for (const item of [...trends, ...hn]) {
    const key = normalizeKey(item.title);
    if (!key) continue;
    const existing = merged.get(key);
    if (existing) {
      existing.signal_score += item.score;
      existing.sources.push(item.source);
    } else {
      merged.set(key, {
        keyword: item.title.trim(),
        signal_score: item.score,
        sources: [item.source],
        reference_url: item.url,
      });
    }
  }

  const ranked = [...merged.values()]
    .sort((a, b) => b.signal_score - a.signal_score)
    .slice(0, TOP_N)
    .map((candidate) => ({
      keyword: candidate.keyword,
      search_intent: guessSearchIntent(candidate.keyword),
      niche_context: 'AI Pickle — hands-on reviews and comparisons of AI tools and software',
      signal_score: candidate.signal_score,
      sources: [...new Set(candidate.sources)],
      reference_url: candidate.reference_url,
    }));

  if (ranked.length === 0) {
    console.error('No niche-matching candidates found in this run. Try again later, or widen NICHE_TERMS.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'data', 'keywords');
  const outFile = path.join(outDir, `${today}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, JSON.stringify(ranked, null, 2), 'utf-8');

  console.error(`Wrote ${ranked.length} candidate(s) to ${path.relative(process.cwd(), outFile)}`);
  console.log(JSON.stringify(ranked, null, 2));
}

main().catch((err) => {
  console.error('Keyword research agent failed:', err);
  process.exit(1);
});

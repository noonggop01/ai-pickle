#!/usr/bin/env node
// Agent 2 — Draft Writer
//
// Takes one topic candidate from Agent 1 (data/keywords/*.json) and turns
// it into a blog draft matching src/content.config.ts, saved directly as
// a Markdown file in src/content/blog/ with `draft: true` — so nothing
// goes live until a human reviews it, fills in the [EXPERIENCE: ...]
// placeholders, and flips the flag.

import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { loadDotEnv } from '../lib/env.mjs';
import { callClaudeForStructuredOutput } from '../lib/claude.mjs';

const SITE_NAME = 'AI Pickle';
const ALLOWED_CATEGORIES = [
  'AI Writing Tools',
  'AI Coding Tools',
  'AI Image & Video Tools',
  'AI Productivity & Automation',
  'AI Chatbots & Assistants',
  'AI News & Analysis',
];

const SYSTEM_PROMPT = `You are the draft writer for ${SITE_NAME}, an English-language blog that publishes honest, hands-on reviews and comparisons of AI tools and software. You write for real readers deciding whether to spend money or time on a tool — not for search engines.

You will receive a TOPIC SIGNAL, not a ready-made headline. It's often a raw trending story, forum title, or discussion topic (e.g. a Hacker News post) — not a literal search phrase and not something to just summarize. Your job is to find the genuinely useful angle inside it for someone evaluating AI tools, and write a real article about that angle. Do not just recap the source item.

Writing rules:
- 1200-1800 words, natural conversational English. Read it back in your head — if it sounds robotic, rewrite it.
- NEVER use these phrases or close variants: "delve into", "in today's fast-paced world", "moreover", "furthermore", "it's important to note", "unlock the power of", "in conclusion", "game-changer", "in the ever-evolving landscape".
- Structure: a direct opening (no "in this article we will..." framing), 3-6 H2 sections (## in markdown), at least one comparison table or numbered list where relevant, an FAQ section near the end (3-4 Q&As as ### sub-headings or bold Q lines), no generic summary paragraph at the very end.
- Insert exactly 2-4 placeholders formatted as [EXPERIENCE: one-line hint about what personal detail belongs here] at points where first-hand testing would matter most (a specific prompt you ran, a specific output quality issue, a specific pricing surprise). Do not fabricate personal experience yourself.
- Do not repeat the core keyword/topic more than 3 times total (no keyword stuffing).
- Any factual claim about pricing, data privacy/retention, or legal/compliance status must be followed by "[SOURCE NEEDED]" unless you are certain it's stable, well-known information.
- Pick "category" from exactly this list: ${ALLOWED_CATEGORIES.map((c) => `"${c}"`).join(', ')}.
- "title" must be under 60 characters and not clickbait. "description" must be under 155 characters and describe what the reader will actually learn.
- "slug" must be lowercase kebab-case, no special characters.
- bodyMarkdown must NOT repeat the title as an H1 — start directly with the opening paragraph, then ## sections.`;

const WRITE_DRAFT_TOOL = {
  name: 'write_blog_draft',
  description: 'Submit the finished blog draft in a structured format.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Under 60 characters, not clickbait.' },
      description: { type: 'string', description: 'Under 155 characters, meta description.' },
      slug: { type: 'string', description: 'Lowercase kebab-case URL slug.' },
      category: { type: 'string', enum: ALLOWED_CATEGORIES },
      tags: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
      bodyMarkdown: { type: 'string', description: 'Full article body in Markdown, no H1, no frontmatter.' },
      heroImageAlt: { type: 'string', description: 'Descriptive alt text for a hero image concept, even though no image exists yet.' },
      imageSuggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            placement: { type: 'string' },
            concept: { type: 'string' },
            altText: { type: 'string' },
          },
          required: ['placement', 'concept', 'altText'],
        },
      },
      experiencePlaceholderCount: { type: 'integer', description: 'How many [EXPERIENCE: ...] placeholders are in bodyMarkdown.' },
    },
    required: ['title', 'description', 'slug', 'category', 'tags', 'bodyMarkdown', 'experiencePlaceholderCount'],
  },
};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function yamlString(value) {
  return JSON.stringify(value);
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadLatestKeywordCandidate(explicitIndex) {
  const keywordsDir = path.join(process.cwd(), 'data', 'keywords');
  const files = (await readdir(keywordsDir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) {
    throw new Error('No keyword files found in data/keywords/. Run `npm run research:keywords` first.');
  }
  const latestFile = files[files.length - 1];
  const candidates = JSON.parse(await readFile(path.join(keywordsDir, latestFile), 'utf-8'));
  const index = explicitIndex ?? 0;
  const candidate = candidates[index];
  if (!candidate) {
    throw new Error(`No candidate at index ${index} in ${latestFile} (found ${candidates.length}).`);
  }
  console.error(`Using candidate ${index} from ${latestFile}: "${candidate.keyword}"`);
  return candidate;
}

function parseArgs(argv) {
  const args = { index: undefined, file: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--index') args.index = Number(argv[++i]);
    if (argv[i] === '--file') args.file = argv[++i];
  }
  return args;
}

async function main() {
  await loadDotEnv();
  const { index, file } = parseArgs(process.argv.slice(2));

  const candidate = file
    ? JSON.parse(await readFile(file, 'utf-8'))
    : await loadLatestKeywordCandidate(index);

  console.error('Requesting draft from Claude...');
  const draft = await callClaudeForStructuredOutput({
    system: SYSTEM_PROMPT,
    userMessage: JSON.stringify({
      topic_signal: candidate.keyword,
      search_intent: candidate.search_intent,
      niche_context: candidate.niche_context,
      reference_url: candidate.reference_url ?? null,
    }),
    tool: WRITE_DRAFT_TOOL,
  });

  const title = draft.title.slice(0, 60);
  const description = draft.description.slice(0, 155);
  const slug = slugify(draft.slug || draft.title);
  const pubDate = new Date().toISOString().slice(0, 10);

  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `pubDate: ${pubDate}`,
    `category: ${yamlString(draft.category)}`,
    `tags: ${JSON.stringify(draft.tags ?? [])}`,
    draft.heroImageAlt ? `heroImageAlt: ${yamlString(draft.heroImageAlt)}` : null,
    'draft: true',
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const fileContents = `${frontmatter}${draft.bodyMarkdown.trim()}\n`;

  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  await mkdir(blogDir, { recursive: true });

  let outPath = path.join(blogDir, `${slug}.md`);
  let attempt = 2;
  while (await pathExists(outPath)) {
    outPath = path.join(blogDir, `${slug}-${attempt}.md`);
    attempt += 1;
  }

  await writeFile(outPath, fileContents, 'utf-8');

  const finalSlug = path.basename(outPath, '.md');
  const imagesSidecarPath = path.join(blogDir, `${finalSlug}.images.json`);
  await writeFile(
    imagesSidecarPath,
    JSON.stringify(
      {
        heroImageAlt: draft.heroImageAlt ?? title,
        imageSuggestions: draft.imageSuggestions ?? [],
      },
      null,
      2,
    ),
    'utf-8',
  );

  console.error(`\nDraft written to ${path.relative(process.cwd(), outPath)}`);
  console.error(`  title: ${title}`);
  console.error(`  category: ${draft.category}`);
  console.error(`  experience placeholders to fill in: ${draft.experiencePlaceholderCount}`);
  console.error(`  draft: true — flip to false in the frontmatter after human review.`);
  console.error(`  image suggestions saved to ${path.relative(process.cwd(), imagesSidecarPath)} for Agent 3.`);
}

main().catch((err) => {
  console.error('Draft writer agent failed:', err.message);
  process.exit(1);
});

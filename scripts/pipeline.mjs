#!/usr/bin/env node
// Runs Agent 1 -> Agent 2 -> Agent 3 -> Agent 4 for one new post.
//
// Usage:
//   npm run pipeline                  # research + draft candidate 0 + images + QA
//   npm run pipeline -- --index 2     # draft a specific keyword candidate instead
//   npm run pipeline -- --skip-research  # reuse the latest data/keywords/*.json

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findLatestPostSlug } from './lib/latest-post.mjs';
import { splitFrontmatter, getFrontmatterField } from './lib/frontmatter.mjs';
import { textOverlap } from './lib/similarity.mjs';

// Lower than qa-checks.mjs's 0.7 (which compares final generated titles).
// Here we're comparing a raw, unpolished topic signal against a polished
// title, which naturally overlaps less even for the same story — so this
// needs a lower bar to catch it before spending an Agent 2 call.
const DUPLICATE_OVERLAP_THRESHOLD = 0.4;

async function findLatestKeywordsFile() {
  const keywordsDir = path.join(process.cwd(), 'data', 'keywords');
  const files = (await readdir(keywordsDir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) return null;
  return path.join(keywordsDir, files[files.length - 1]);
}

async function loadExistingPosts(blogDir) {
  const files = (await readdir(blogDir).catch(() => [])).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const text = await readFile(path.join(blogDir, file), 'utf-8');
    const { frontmatterLines } = splitFrontmatter(text);
    const title = getFrontmatterField(frontmatterLines, 'title');
    const sourceUrl = getFrontmatterField(frontmatterLines, 'sourceUrl');
    if (title) posts.push({ title, sourceUrl });
  }
  return posts;
}

// Starting from startIndex, returns the first candidate index that isn't a
// rehash of an already-published post — cheaper to check here than to spend
// an Agent 2 call drafting something QA will just flag. Two signals: an
// exact source-URL match (same underlying story, very reliable) or enough
// word overlap with an existing title to look like the same topic reworded.
export async function pickNonDuplicateIndex(startIndex, blogDir) {
  const keywordsFile = await findLatestKeywordsFile();
  if (!keywordsFile) return startIndex;

  const candidates = JSON.parse(await readFile(keywordsFile, 'utf-8'));
  const existingPosts = await loadExistingPosts(blogDir);
  const usedSourceUrls = new Set(existingPosts.filter((p) => p.sourceUrl).map((p) => p.sourceUrl));

  for (let i = startIndex; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate?.keyword) continue;

    if (candidate.reference_url && usedSourceUrls.has(candidate.reference_url)) {
      console.log(`(pipeline) candidate ${i} ("${candidate.keyword}") has the same source URL as an existing post — skipping`);
      continue;
    }

    const bestOverlap = Math.max(0, ...existingPosts.map((p) => textOverlap(candidate.keyword, p.title)));
    if (bestOverlap < DUPLICATE_OVERLAP_THRESHOLD) {
      if (i !== startIndex) {
        console.log(`(pipeline) skipped candidate(s) ${startIndex}-${i - 1} as likely duplicates of existing posts, using ${i} instead`);
      }
      return i;
    }
    console.log(`(pipeline) candidate ${i} ("${candidate.keyword}") overlaps ${Math.round(bestOverlap * 100)}% with an existing post — skipping`);
  }

  console.log('(pipeline) no non-duplicate candidate found — falling back to the originally requested index');
  return startIndex;
}

function parseArgs(argv) {
  const args = { index: 0, skipResearch: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--index') args.index = Number(argv[++i]);
    if (argv[i] === '--skip-research') args.skipResearch = true;
  }
  return args;
}

function run(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const { index, skipResearch } = parseArgs(process.argv.slice(2));
  const agentsDir = path.join(process.cwd(), 'scripts', 'agents');
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');

  if (skipResearch) {
    console.log('\n=== Skipping Agent 1 (reusing latest keyword data) ===');
  } else {
    console.log('\n=== Agent 1: Keyword Research ===');
    await run(path.join(agentsDir, 'keyword-research.mjs'));
  }

  const resolvedIndex = await pickNonDuplicateIndex(index, blogDir);

  console.log('\n=== Agent 2: Draft Writer ===');
  await run(path.join(agentsDir, 'draft-writer.mjs'), ['--index', String(resolvedIndex)]);

  const slug = await findLatestPostSlug(blogDir);
  console.log(`\n(pipeline) new post slug: ${slug}`);

  console.log('\n=== Agent 3: Images ===');
  try {
    await run(path.join(agentsDir, 'image-agent.mjs'), ['--slug', slug]);
  } catch (err) {
    console.error(`(pipeline) image generation failed, continuing without images: ${err.message}`);
  }

  console.log('\n=== Agent 4: Automated QA ===');
  let qaFailed = false;
  try {
    await run(path.join(agentsDir, 'qa-agent.mjs'), ['--slug', slug]);
  } catch {
    qaFailed = true;
  }

  console.log('\n=== Done ===');
  console.log(`Post: src/content/blog/${slug}.md`);
  console.log(qaFailed ? 'QA found hard failures — check the report above before reviewing.' : 'QA passed or only has warnings.');
  console.log('Next: open the file, fill in [EXPERIENCE: ...] placeholders, verify [SOURCE NEEDED] claims,');
  console.log('flip `draft: true` to `draft: false`, then commit and push to publish.');
}

// Guard against side effects on `import()` — this file exports
// pickNonDuplicateIndex for testing, and importing it shouldn't run the
// whole pipeline (agents cost real API calls).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('\nPipeline stopped:', err.message);
    process.exit(1);
  });
}

#!/usr/bin/env node
// Runs Agent 1 -> Agent 2 -> Agent 3 -> Agent 4 for one new post.
//
// Usage:
//   npm run pipeline                  # research + draft candidate 0 + images + QA
//   npm run pipeline -- --index 2     # draft a specific keyword candidate instead
//   npm run pipeline -- --skip-research  # reuse the latest data/keywords/*.json

import { spawn } from 'node:child_process';
import path from 'node:path';
import { findLatestPostSlug } from './lib/latest-post.mjs';

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

  console.log('\n=== Agent 2: Draft Writer ===');
  await run(path.join(agentsDir, 'draft-writer.mjs'), ['--index', String(index)]);

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

main().catch((err) => {
  console.error('\nPipeline stopped:', err.message);
  process.exit(1);
});

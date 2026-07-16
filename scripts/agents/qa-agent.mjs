#!/usr/bin/env node
// Agent 4 — Automated QA
//
// Runs a checklist against draft posts so the human reviewer only has to
// look at what's flagged, not read the whole thing from scratch. By
// default it scans every post still marked draft: true; pass --slug to
// check just one.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { splitFrontmatter, getFrontmatterField } from '../lib/frontmatter.mjs';
import { runAllChecks, overallStatus } from '../lib/qa-checks.mjs';

function parseArgs(argv) {
  const args = { slug: undefined, all: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug') args.slug = argv[++i];
    if (argv[i] === '--all') args.all = true;
  }
  return args;
}

function frontmatterToData(frontmatterLines) {
  const data = {};
  for (const line of frontmatterLines) {
    const key = line.slice(0, line.indexOf(':')).trim();
    if (!key) continue;
    data[key] = getFrontmatterField(frontmatterLines, key);
  }
  return data;
}

async function loadAllPosts(blogDir) {
  const files = (await readdir(blogDir)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const text = await readFile(path.join(blogDir, file), 'utf-8');
    const { frontmatterLines, body } = splitFrontmatter(text);
    posts.push({ slug, data: frontmatterToData(frontmatterLines), body });
  }
  return posts;
}

const STATUS_ICON = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };

async function main() {
  const { slug, all } = parseArgs(process.argv.slice(2));
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const allPosts = await loadAllPosts(blogDir);

  const targets = slug
    ? allPosts.filter((p) => p.slug === slug)
    : allPosts.filter((p) => all || p.data.draft === true);

  if (targets.length === 0) {
    console.error(slug ? `No post found with slug "${slug}".` : 'No draft posts to check (use --all to check everything).');
    return;
  }

  let anyFail = false;

  for (const post of targets) {
    const others = allPosts.filter((p) => p.slug !== post.slug);
    const checks = runAllChecks(post.data, post.body, others);
    const status = overallStatus(checks);
    if (status === 'fail') anyFail = true;

    console.log(`\n${post.slug} — ${status.toUpperCase()}`);
    for (const check of checks) {
      console.log(`  [${STATUS_ICON[check.status]}] ${check.name}: ${check.message}`);
    }

    const qaPath = path.join(blogDir, `${post.slug}.qa.json`);
    await writeFile(qaPath, JSON.stringify({ slug: post.slug, status, checks }, null, 2), 'utf-8');
  }

  console.log(`\nChecked ${targets.length} post(s).`);
  if (anyFail) {
    console.error('One or more posts have hard failures — fix before human review.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('QA agent failed:', err.message);
  process.exit(1);
});

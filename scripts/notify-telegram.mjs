#!/usr/bin/env node
// Sends a Telegram notification for a newly opened draft PR, with an
// inline "Approve & Publish" button. Run after `gh pr create`.
//
// Usage: node scripts/notify-telegram.mjs --slug <slug> --pr <number> --pr-url <url>

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { splitFrontmatter, getFrontmatterField } from './lib/frontmatter.mjs';
import { sendMessage } from './lib/telegram.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug') args.slug = argv[++i];
    if (argv[i] === '--pr') args.pr = argv[++i];
    if (argv[i] === '--pr-url') args.prUrl = argv[++i];
  }
  return args;
}

async function main() {
  const { slug, pr, prUrl } = parseArgs(process.argv.slice(2));
  if (!slug || !pr || !prUrl) throw new Error('Usage: --slug <slug> --pr <number> --pr-url <url>');

  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const mdText = await readFile(path.join(blogDir, `${slug}.md`), 'utf-8');
  const { frontmatterLines, body } = splitFrontmatter(mdText);
  const title = getFrontmatterField(frontmatterLines, 'title') ?? slug;
  const description = getFrontmatterField(frontmatterLines, 'description') ?? '';
  const category = getFrontmatterField(frontmatterLines, 'category') ?? '';

  const experienceCount = [...body.matchAll(/\[EXPERIENCE:[^\]]*\]/g)].length;
  const sourceNeededCount = [...body.matchAll(/\[SOURCE NEEDED\]/g)].length;

  let qaLine = '';
  try {
    const qa = JSON.parse(await readFile(path.join(blogDir, `${slug}.qa.json`), 'utf-8'));
    const failCount = qa.checks.filter((c) => c.status === 'fail').length;
    const warnCount = qa.checks.filter((c) => c.status === 'warn').length;
    qaLine = `QA: ${qa.status.toUpperCase()} (${failCount} fail, ${warnCount} warn)\n`;
  } catch {
    // no QA report — skip that line
  }

  const lines = [
    `New draft: ${title}`,
    category ? `Category: ${category}` : null,
    description ? `\n${description}` : null,
    '',
    qaLine.trim(),
    `To fill in: ${experienceCount} [EXPERIENCE] placeholder(s), ${sourceNeededCount} [SOURCE NEEDED] tag(s)`,
    '',
    `Review/edit: ${prUrl}`,
    '',
    experienceCount + sourceNeededCount > 0
      ? "Edit the file in the PR first (fill placeholders), then tap Approve — it'll refuse to publish if anything's still unresolved."
      : 'No placeholders left to fill — tap Approve to publish as-is, or edit the PR first if you want changes.',
  ].filter((l) => l !== null);

  await sendMessage(lines.join('\n'), {
    replyMarkup: {
      inline_keyboard: [[{ text: '✅ Approve & Publish', callback_data: `approve:${pr}` }]],
    },
  });

  console.log(`Telegram notification sent for PR #${pr}.`);
}

main().catch((err) => {
  console.error('Telegram notification failed:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
// Polls Telegram for "Approve & Publish" button taps on draft PRs.
// Run on a schedule from GitHub Actions. Requires `git` identity and `gh`
// auth to already be set up by the workflow (same pattern as daily-draft.yml).
//
// Safety: refuses to merge (and tells the user why) if the post still has
// unresolved [EXPERIENCE: ...] or [SOURCE NEEDED] markers — the point of
// this bot is a one-tap "ship it" trigger, not a way to accidentally
// publish an unfinished draft.

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { getUpdates, confirmUpdatesThrough, answerCallbackQuery, sendMessage } from './lib/telegram.mjs';
import { splitFrontmatter, setFrontmatterField, joinFrontmatter } from './lib/frontmatter.mjs';

const SITE_URL = 'https://noonggop01.github.io/ai-pickle';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function findUnresolvedMarkers(text) {
  const experience = [...text.matchAll(/\[EXPERIENCE:[^\]]*\]/g)].length;
  const sourceNeeded = [...text.matchAll(/\[SOURCE NEEDED\]/g)].length;
  return experience + sourceNeeded;
}

async function processApproval(prNumber) {
  const pr = JSON.parse(sh(`gh pr view ${prNumber} --json state,headRefName,url,number`));

  if (pr.state !== 'OPEN') {
    await sendMessage(`PR #${prNumber} is already ${pr.state.toLowerCase()} — nothing to do.`);
    return;
  }

  sh(`git fetch origin ${pr.headRefName}`);
  sh(`git checkout ${pr.headRefName}`);
  sh(`git reset --hard origin/${pr.headRefName}`);

  const changedFiles = JSON.parse(sh(`gh pr view ${prNumber} --json files --jq ".files"`))
    .map((f) => f.path)
    .filter((p) => p.startsWith('src/content/blog/') && p.endsWith('.md'));

  if (changedFiles.length === 0) {
    await sendMessage(`PR #${prNumber} has no post file to publish — check it manually: ${pr.url}`);
    return;
  }

  let unresolvedTotal = 0;
  const fileContents = {};

  for (const file of changedFiles) {
    const text = await readFile(file, 'utf-8');
    fileContents[file] = text;
    unresolvedTotal += findUnresolvedMarkers(text);
  }

  if (unresolvedTotal > 0) {
    await sendMessage(
      `Can't publish PR #${prNumber} yet — ${unresolvedTotal} unresolved [EXPERIENCE]/[SOURCE NEEDED] marker(s) still in the post. Edit it in the PR, then tap Approve again: ${pr.url}`,
    );
    return;
  }

  let changed = false;
  let slug = null;
  for (const file of changedFiles) {
    const { frontmatterLines, body } = splitFrontmatter(fileContents[file]);
    slug = file.replace('src/content/blog/', '').replace(/\.md$/, '');
    const draftLine = frontmatterLines.find((l) => l.startsWith('draft:'));
    if (draftLine && draftLine.includes('true')) {
      setFrontmatterField(frontmatterLines, 'draft', 'false');
      await writeFile(file, joinFrontmatter(frontmatterLines, body), 'utf-8');
      changed = true;
    }
  }

  if (changed) {
    sh('git add src/content/blog');
    sh(`git commit -m "Approve via Telegram: flip draft to false"`);
    sh(`git push origin ${pr.headRefName}`);
  }

  sh(`gh pr merge ${prNumber} --squash --delete-branch`);

  // Pushes/merges made with the default GITHUB_TOKEN don't trigger other
  // workflows' `on: push` (a loop-prevention rule) — deploy.yml wouldn't
  // fire on its own, so kick it off explicitly.
  sh('gh workflow run deploy.yml --ref master');

  await sendMessage(`Published! ${SITE_URL}/blog/${slug}/`);
}

async function main() {
  const updates = await getUpdates();
  if (updates.length === 0) return;

  let maxUpdateId = 0;
  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);

    const callback = update.callback_query;
    if (!callback?.data) continue;

    const match = callback.data.match(/^approve:(\d+)$/);
    if (!match) continue;

    await answerCallbackQuery(callback.id, 'Processing...');
    try {
      await processApproval(match[1]);
    } catch (err) {
      await sendMessage(`Approving PR #${match[1]} failed: ${err.message}`);
    }
  }

  await confirmUpdatesThrough(maxUpdateId);
}

main().catch((err) => {
  console.error('Telegram approve poller failed:', err.message);
  process.exit(1);
});

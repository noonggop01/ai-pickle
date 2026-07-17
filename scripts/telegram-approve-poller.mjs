#!/usr/bin/env node
// Polls Telegram for two things on draft PRs:
//   1. The "Approve & Publish" button being tapped
//   2. A plain-text reply (in Korean) with notes for [EXPERIENCE: ...]
//      placeholders, which get translated/integrated into the draft
// Run on a schedule from GitHub Actions. Requires `git` identity and `gh`
// auth to already be set up by the workflow (same pattern as daily-draft.yml).
//
// Safety: refuses to merge (and says why) if the post still has unresolved
// [EXPERIENCE: ...] or [SOURCE NEEDED] markers — the Approve button is a
// one-tap "ship it" trigger, not a way to accidentally publish an
// unfinished draft.

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { getUpdates, confirmUpdatesThrough, answerCallbackQuery, sendMessage } from './lib/telegram.mjs';
import { splitFrontmatter, setFrontmatterField, joinFrontmatter } from './lib/frontmatter.mjs';
import { localizePlaceholders } from './lib/localize.mjs';

const SITE_URL = 'https://noonggop01.github.io/ai-pickle';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function findUnresolvedMarkers(text) {
  const experience = [...text.matchAll(/\[EXPERIENCE:[^\]]*\]/g)].length;
  const sourceNeeded = [...text.matchAll(/\[SOURCE NEEDED\]/g)].length;
  return experience + sourceNeeded;
}

function checkoutPrBranch(headRefName) {
  sh(`git fetch origin ${headRefName}`);
  sh(`git checkout ${headRefName}`);
  sh(`git reset --hard origin/${headRefName}`);
}

function getChangedPostFiles(prNumber) {
  return JSON.parse(sh(`gh pr view ${prNumber} --json files --jq ".files"`))
    .map((f) => f.path)
    .filter((p) => p.startsWith('src/content/blog/') && p.endsWith('.md'));
}

async function processApproval(prNumber) {
  const pr = JSON.parse(sh(`gh pr view ${prNumber} --json state,headRefName,url,number`));

  if (pr.state !== 'OPEN') {
    await sendMessage(`PR #${prNumber}은 이미 ${pr.state === 'MERGED' ? '발행됨' : '닫힘'} 상태예요 — 할 일 없음.`);
    return;
  }

  checkoutPrBranch(pr.headRefName);
  const changedFiles = getChangedPostFiles(prNumber);

  if (changedFiles.length === 0) {
    await sendMessage(`PR #${prNumber}에 글 파일이 없어요, 직접 확인해주세요: ${pr.url}`);
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
      `아직 발행 못해요 — 안 채워진 내용이 ${unresolvedTotal}개 남아있어요. 이 채팅에 아는 내용을 한글로 답장해주시거나, PR에서 직접 수정한 다음 다시 승인해주세요: ${pr.url}`,
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

  await sendMessage(`🎉 발행됐어요! ${SITE_URL}/blog/${slug}/`);
}

async function processLocalizeNotes(koreanNotes) {
  const openPRs = JSON.parse(sh('gh pr list --state open --json number,headRefName,url'));
  if (openPRs.length === 0) {
    await sendMessage('지금 열려있는 초안 PR이 없어요. 새 초안이 오면 다시 답장해주세요.');
    return;
  }
  if (openPRs.length > 1) {
    const list = openPRs.map((p) => `#${p.number}: ${p.url}`).join('\n');
    await sendMessage(`열려있는 초안 PR이 ${openPRs.length}개라 어디에 반영할지 애매해요. 하나씩 정리해주세요:\n${list}`);
    return;
  }
  const pr = openPRs[0];

  checkoutPrBranch(pr.headRefName);
  const changedFiles = getChangedPostFiles(pr.number);

  if (changedFiles.length === 0) {
    await sendMessage(`PR #${pr.number}에 글 파일이 없어요, 직접 확인해주세요: ${pr.url}`);
    return;
  }

  let totalFilled = 0;
  let remaining = 0;
  for (const file of changedFiles) {
    const text = await readFile(file, 'utf-8');
    const { frontmatterLines, body } = splitFrontmatter(text);
    const { bodyMarkdown: updatedBody, filledCount } = await localizePlaceholders(body, koreanNotes);
    totalFilled += filledCount;
    remaining += findUnresolvedMarkers(updatedBody);
    if (updatedBody !== body) {
      await writeFile(file, joinFrontmatter(frontmatterLines, updatedBody), 'utf-8');
    }
  }

  sh('git add src/content/blog');
  sh('git commit -m "Localize placeholders from Telegram notes"');
  sh(`git push origin ${pr.headRefName}`);

  if (remaining > 0) {
    await sendMessage(
      `${totalFilled}개 반영했어요. 아직 ${remaining}개 남았어요 — 계속 답장하시거나 PR에서 직접 채워주세요: ${pr.url}`,
    );
  } else {
    await sendMessage(`${totalFilled}개 다 반영했어요! 확인하고 승인해주세요: ${pr.url}`, {
      replyMarkup: {
        inline_keyboard: [[{ text: '✅ 승인하고 발행', callback_data: `approve:${pr.number}` }]],
      },
    });
  }
}

async function main() {
  const updates = await getUpdates();
  if (updates.length === 0) return;

  let maxUpdateId = 0;
  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);

    const callback = update.callback_query;
    if (callback?.data) {
      const match = callback.data.match(/^approve:(\d+)$/);
      if (match) {
        await answerCallbackQuery(callback.id, 'Processing...');
        try {
          await processApproval(match[1]);
        } catch (err) {
          await sendMessage(`PR #${match[1]} 승인 처리 중 오류: ${err.message}`);
        }
      }
      continue;
    }

    const text = update.message?.text;
    if (text && !text.startsWith('/')) {
      try {
        await processLocalizeNotes(text);
      } catch (err) {
        await sendMessage(`내용 반영 중 오류가 났어요: ${err.message}`);
      }
    }
  }

  await confirmUpdatesThrough(maxUpdateId);
}

main().catch((err) => {
  console.error('Telegram approve poller failed:', err.message);
  process.exit(1);
});

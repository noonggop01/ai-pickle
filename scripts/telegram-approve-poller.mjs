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
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  getUpdates,
  confirmUpdatesThrough,
  answerCallbackQuery,
  sendMessage,
  isApprovalCommand,
} from './lib/telegram.mjs';
import { splitFrontmatter, setFrontmatterField, joinFrontmatter } from './lib/frontmatter.mjs';
import { localizePlaceholders } from './lib/localize.mjs';

const SITE_URL = 'https://noonggop01.github.io/ai-pickle';

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    // execSync's default error message ("Command failed: ...") doesn't
    // include the actual stderr — without this, failures show up in
    // Telegram as a useless generic message.
    const detail = (err.stderr || err.stdout || '').toString().trim();
    throw new Error(detail ? `${cmd}\n${detail}` : err.message);
  }
}

function findUnresolvedMarkers(text) {
  const experience = [...text.matchAll(/\[EXPERIENCE:[^\]]*\]/g)].length;
  const sourceNeeded = [...text.matchAll(/\[SOURCE NEEDED\]/g)].length;
  return experience + sourceNeeded;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GitHub computes mergeability asynchronously after a push — attempting a
// merge immediately can fail with "not mergeable" even though it settles to
// mergeable a few seconds later. Poll briefly before giving up.
async function waitForMergeable(prNumber, attempts = 6, delayMs = 5000) {
  for (let i = 0; i < attempts; i++) {
    const state = sh(`gh pr view ${prNumber} --json mergeable --jq .mergeable`);
    if (state !== 'UNKNOWN') return state;
    await sleep(delayMs);
  }
  return 'UNKNOWN';
}

async function markPublishedForWorkflow() {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, 'published=true\n');
  }
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

function getOpenDraftPrs() {
  return JSON.parse(sh('gh pr list --state open --json number,headRefName,url'))
    .filter((pr) => pr.headRefName.startsWith('draft/'));
}

async function processApproval(prNumber) {
  const pr = JSON.parse(sh(`gh pr view ${prNumber} --json state,headRefName,url,number`));

  if (pr.state !== 'OPEN') {
    if (pr.state === 'MERGED') await markPublishedForWorkflow();
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

  const mergeable = await waitForMergeable(prNumber);
  if (mergeable === 'CONFLICTING') {
    await sendMessage(`PR #${prNumber}에 충돌이 있어서 자동 머지가 안 돼요 — 직접 확인해주세요: ${pr.url}`);
    return;
  }

  try {
    sh(`gh pr merge ${prNumber} --squash --delete-branch`);
  } catch (err) {
    const detail = mergeable === 'UNKNOWN'
      ? 'GitHub가 아직 머지 가능 여부를 계산 중일 수 있어요.'
      : err.message;
    throw new Error(`PR #${prNumber} 머지 실패: ${detail} ${pr.url}`);
  }

  // The default GITHUB_TOKEN can't trigger other workflows (`on: push` or
  // `workflow_dispatch` both get silently ignored — a loop-prevention
  // rule), so `gh workflow run deploy.yml` from here never actually
  // deploys. Signal the workflow instead so it can build+deploy inline in
  // this same run, which doesn't hit that restriction.
  await markPublishedForWorkflow();

  try {
    await sendMessage(`🎉 발행됐어요! ${SITE_URL}/blog/${slug}/`);
  } catch (error) {
    console.warn(`Post was published, but the Telegram success message failed: ${error.message}`);
  }
}

async function processLocalizeNotes(koreanNotes) {
  const openPRs = getOpenDraftPrs();
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
  const stagedFiles = sh('git diff --staged --name-only');
  if (stagedFiles) {
    sh('git commit -m "Localize placeholders from Telegram notes"');
    sh(`git push origin ${pr.headRefName}`);
  }

  if (remaining > 0) {
    await sendMessage(
      `${totalFilled}개 반영했어요. 아직 ${remaining}개 남았어요 — 계속 답장하시거나 PR에서 직접 채워주세요: ${pr.url}`,
    );
  } else {
    await sendMessage(`${totalFilled}개 다 반영했어요! 확인하고 승인해주세요: ${pr.url}\n\n버튼 반응이 없으면 이 채팅에 발행이라고 보내주세요.`, {
      replyMarkup: {
        inline_keyboard: [[{ text: '✅ 승인하고 발행', callback_data: `approve:${pr.number}` }]],
      },
    });
  }
}

async function processTextApproval() {
  const openPRs = getOpenDraftPrs();
  if (openPRs.length === 0) {
    await sendMessage('지금 발행을 기다리는 초안이 없어요.');
    return;
  }
  if (openPRs.length > 1) {
    const list = openPRs.map((pr) => `#${pr.number}: ${pr.url}`).join('\n');
    await sendMessage(`발행 대기 중인 초안이 여러 개라 자동 선택할 수 없어요:\n${list}`);
    return;
  }

  await processApproval(openPRs[0].number);
}

async function main() {
  const updates = (await getUpdates()).sort((a, b) => a.update_id - b.update_id);
  if (updates.length === 0) return;

  console.log(`Processing ${updates.length} Telegram update(s).`);
  for (const update of updates) {
    try {
      const callback = update.callback_query;
      if (callback?.data) {
        const match = callback.data.match(/^approve:(\d+)$/);
        if (match) {
          try {
            await answerCallbackQuery(callback.id, 'Processing...');
          } catch (error) {
            console.warn(`Could not acknowledge Telegram callback ${update.update_id}: ${error.message}`);
          }

          console.log(`Processing approval for PR #${match[1]} from update ${update.update_id}.`);
          await processApproval(match[1]);
        }
      } else {
        const text = update.message?.text;
        if (text && !text.startsWith('/')) {
          if (isApprovalCommand(text)) {
            console.log(`Processing text approval from update ${update.update_id}.`);
            await processTextApproval();
          } else {
            console.log(`Processing Korean draft notes from update ${update.update_id}.`);
            await processLocalizeNotes(text);
          }
        }
      }

      await confirmUpdatesThrough(update.update_id);
      console.log(`Confirmed Telegram update ${update.update_id}.`);
    } catch (error) {
      console.error(`Telegram update ${update.update_id} failed and will be retried: ${error.message}`);
      const callbackPr = update.callback_query?.data?.match(/^approve:(\d+)$/)?.[1];
      const errorMessage = callbackPr
        ? `PR #${callbackPr} 승인 처리 중 오류가 났어요. 자동으로 다시 시도할게요: ${error.message}`
        : `내용 반영 중 오류가 났어요. 자동으로 다시 시도할게요: ${error.message}`;

      try {
        await sendMessage(errorMessage);
      } catch (notifyError) {
        console.error(`Could not send Telegram failure notice: ${notifyError.message}`);
      }

      throw error;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Telegram approve poller failed:', err.message);
    process.exit(1);
  });
}

#!/usr/bin/env node
// Sends a Telegram notification for a newly opened draft PR, with an
// inline "Approve & Publish" button. Run after `gh pr create`.
//
// Usage: node scripts/notify-telegram.mjs --slug <slug> --pr <number> --pr-url <url>

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { splitFrontmatter, getFrontmatterField } from './lib/frontmatter.mjs';
import { sendMessage } from './lib/telegram.mjs';
import { translateHintsToKorean } from './lib/localize.mjs';
import { loadDotEnv } from './lib/env.mjs';

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
  await loadDotEnv();
  const { slug, pr, prUrl } = parseArgs(process.argv.slice(2));
  if (!slug || !pr || !prUrl) throw new Error('Usage: --slug <slug> --pr <number> --pr-url <url>');

  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const mdText = await readFile(path.join(blogDir, `${slug}.md`), 'utf-8');
  const { frontmatterLines, body } = splitFrontmatter(mdText);
  const title = getFrontmatterField(frontmatterLines, 'title') ?? slug;
  const description = getFrontmatterField(frontmatterLines, 'description') ?? '';
  const category = getFrontmatterField(frontmatterLines, 'category') ?? '';

  const experienceHintsEn = [...body.matchAll(/\[EXPERIENCE:([^\]]*)\]/g)].map((m) => m[1].trim());
  const sourceNeededCount = [...body.matchAll(/\[SOURCE NEEDED\]/g)].length;
  const experienceHints = await translateHintsToKorean(experienceHintsEn);

  let qaLine = '';
  try {
    const qa = JSON.parse(await readFile(path.join(blogDir, `${slug}.qa.json`), 'utf-8'));
    const failCount = qa.checks.filter((c) => c.status === 'fail').length;
    const warnCount = qa.checks.filter((c) => c.status === 'warn').length;
    qaLine = `자동 검수: ${qa.status.toUpperCase()} (실패 ${failCount}, 경고 ${warnCount})`;
  } catch {
    // no QA report — skip that line
  }

  const lines = [
    `📝 새 초안: ${title}`,
    category ? `분류: ${category}` : null,
    description ? `\n${description}` : null,
    '',
    qaLine || null,
    '',
  ];

  if (experienceHints.length > 0 || sourceNeededCount > 0) {
    lines.push('채워야 할 내용:');
    experienceHints.forEach((hint, i) => lines.push(`${i + 1}. ${hint}`));
    if (sourceNeededCount > 0) {
      lines.push(`+ 사실 확인 필요한 문장 ${sourceNeededCount}개 (특별히 아는 내용 없으면 자동으로 순화 처리돼요)`);
    }
    lines.push('');
    lines.push('👉 이 메시지에 아는 내용을 한글로 편하게 답장해주세요. 자동으로 영어로 녹여서 반영할게요.');
  } else {
    lines.push('채울 내용 없음 — 바로 승인하셔도 돼요.');
  }

  lines.push('', `전체 보기: ${prUrl}`, '', '다 되면 아래 버튼으로 승인하면 바로 발행돼요.');

  await sendMessage(
    lines.filter((l) => l !== null).join('\n'),
    {
      replyMarkup: {
        inline_keyboard: [[{ text: '✅ 승인하고 발행', callback_data: `approve:${pr}` }]],
      },
    },
  );

  console.log(`Telegram notification sent for PR #${pr}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Telegram notification failed:', err.message);
    process.exit(1);
  });
}

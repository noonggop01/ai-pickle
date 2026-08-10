#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { loadDotEnv } from './lib/env.mjs';
import { sendMessage } from './lib/telegram.mjs';

const MANUAL_APPROVAL_URL =
  'https://github.com/noonggop01/ai-pickle/actions/workflows/telegram-approve.yml';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pr') args.pr = argv[++i];
    if (argv[i] === '--pr-url') args.prUrl = argv[++i];
  }
  return args;
}

async function main() {
  await loadDotEnv();
  const { pr, prUrl } = parseArgs(process.argv.slice(2));
  if (!pr || !prUrl) throw new Error('Usage: --pr <number> --pr-url <url>');

  await sendMessage(
    [
      `⏳ 아직 검토 중인 초안 PR #${pr}이 남아 있어 오늘 새 글 생성은 잠시 보류했어요.`,
      '',
      '수정할 내용이 있으면 이 채팅에 한글로 답장해주세요.',
      '이미 확인을 마쳤다면 아래 버튼을 눌러 발행해주세요.',
      '승인 후 15분이 지나도 게시되지 않으면 두 번째 버튼에서 Run workflow를 눌러주세요.',
      '',
      `초안 전체 보기: ${prUrl}`,
    ].join('\n'),
    {
      replyMarkup: {
        inline_keyboard: [
          [{ text: '✅ 승인하고 발행', callback_data: `approve:${pr}` }],
          [{ text: '⚡ 15분 지연 시 수동 실행', url: MANUAL_APPROVAL_URL }],
        ],
      },
    },
  );

  console.log(`Fresh approval button sent for pending PR #${pr}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Pending draft reminder failed:', error.message);
    process.exit(1);
  });
}

#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { loadDotEnv } from './lib/env.mjs';
import { approvalReplyKeyboard, sendMessage } from './lib/telegram.mjs';

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
      '이미 확인을 마쳤다면 채팅창 아래의 발행 버튼을 눌러주세요.',
      '버튼을 누르면 발행이라는 일반 메시지가 전송되어 더 안정적으로 처리돼요.',
      `15분이 지나도 게시되지 않으면 수동 실행: ${MANUAL_APPROVAL_URL}`,
      '',
      `초안 전체 보기: ${prUrl}`,
    ].join('\n'),
    {
      replyMarkup: approvalReplyKeyboard(),
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

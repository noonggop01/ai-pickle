# AI Pickle

AI Pickle is an English-language blog about practical AI tools. It is built with Astro,
published on GitHub Pages, and supported by an automated draft pipeline with Telegram
review and approval.

Live site: https://noonggop01.github.io/ai-pickle/

## How publishing works

1. The daily GitHub Action researches a topic and creates one draft pull request.
2. Telegram sends a Korean review summary and the fields that need human input.
3. Jack replies or taps the approval button.
4. The approval workflow validates the draft, merges it, and deploys GitHub Pages.

Only one draft pull request remains open at a time. If a draft is still waiting for
review, the next scheduled run sends a reminder instead of creating another draft.

## Local commands

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run check
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev -- --background` | Start the Astro development server in the background |
| `npm run check` | Run tests, content validation, and a production build |
| `npm run pipeline` | Run keyword research, drafting, images, and QA locally |
| `npm run validate:content` | Block published posts with unresolved review markers |

Manage the background development server with `astro dev status`, `astro dev logs`, and
`astro dev stop`.

## Important folders

- `src/content/blog/`: Markdown articles and draft frontmatter
- `public/images/blog/`: generated article images
- `scripts/agents/`: research, drafting, image, and QA agents
- `scripts/telegram-approve-poller.mjs`: Telegram edit/approval processing
- `.github/workflows/`: scheduled drafting, approval, CI, and deployment

## Secrets

Local secrets belong in `.env` and must never be committed. GitHub Actions uses repository
secrets for `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.

import { callClaudeForStructuredOutput } from './claude.mjs';

const SYSTEM_PROMPT = `You help localize a blog post draft. The author is a native Korean speaker writing an English-language blog. You'll receive two kinds of items to resolve:

1. EXPERIENCE placeholders (e.g. "[EXPERIENCE: hint]") — the author has sent notes in Korean containing real, first-hand information meant for some of these.
   - Find the part of the author's Korean notes that addresses each one. Notes may not be in the same order as the placeholders, and may not address every placeholder.
   - If a note addresses it, translate and integrate that real information naturally into 1-3 sentences of conversational English matching the surrounding article's tone. Don't translate word-for-word — write it the way a native English blogger would phrase the same real information.
   - If no note addresses a placeholder, write a brief, honest sentence using general industry-pattern framing instead. Never invent a specific personal claim the author didn't make.

2. SOURCE-NEEDED lines — a full line or sentence from the article that contains a "[SOURCE NEEDED]" tag flagging an unverified claim. The tag can appear anywhere in the line, including as the first word, which can leave a dangling fragment if you just delete it.
   - Rewrite the ENTIRE line naturally with the tag removed, fixing grammar so it reads as a complete, natural sentence — usually by rephrasing the claim as something the reader should verify themselves (e.g. "check the current pricing directly") rather than stating it as fact.
   - Keep everything else in the line as close to the original wording as possible. If the line is a markdown table row (contains "|"), preserve the exact same number of "|" cell separators.
   - The Korean notes are NOT meant for these — resolve them from context alone.

Never use these phrases: "delve into", "moreover", "furthermore", "it's important to note", "in conclusion", "game-changer".

Return one replacement per item, using its exact original text so it can be found and replaced verbatim.`;

const RESOLVE_TOOL = {
  name: 'resolve_placeholders',
  description: 'Submit replacement text for each EXPERIENCE placeholder and SOURCE-NEEDED line.',
  input_schema: {
    type: 'object',
    properties: {
      replacements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string', description: 'Exact original text to find and replace verbatim.' },
            replacement: { type: 'string', description: 'Natural English text to put in its place.' },
          },
          required: ['original', 'replacement'],
        },
      },
    },
    required: ['replacements'],
  },
};

function sourceNeededLines(bodyMarkdown) {
  return bodyMarkdown
    .split('\n')
    .filter((line) => line.includes('[SOURCE NEEDED]'))
    .filter((line, i, arr) => arr.indexOf(line) === i); // dedupe identical lines
}

// Fills [EXPERIENCE: ...] placeholders using the author's Korean notes (or
// general framing if the notes don't cover one), and rewrites lines
// containing [SOURCE NEEDED] tags with full-line context so removing the
// tag doesn't leave a dangling sentence fragment. Returns the updated body
// and how many EXPERIENCE placeholders were resolved (source-needed count
// is reported separately by the caller via a fresh regex count).
export async function localizePlaceholders(bodyMarkdown, koreanNotes) {
  const experiencePlaceholders = [...bodyMarkdown.matchAll(/\[EXPERIENCE:[^\]]*\]/g)].map((m) => m[0]);
  const sourceLines = sourceNeededLines(bodyMarkdown);

  if (experiencePlaceholders.length === 0 && sourceLines.length === 0) {
    return { bodyMarkdown, filledCount: 0 };
  }

  const result = await callClaudeForStructuredOutput({
    system: SYSTEM_PROMPT,
    userMessage: JSON.stringify({ experiencePlaceholders, sourceNeededLines: sourceLines, authorNotesKorean: koreanNotes }),
    tool: RESOLVE_TOOL,
    maxTokens: 8192,
  });

  let updated = bodyMarkdown;
  let filledCount = 0;
  for (const { original, replacement } of result.replacements ?? []) {
    if (updated.includes(original)) {
      updated = updated.replace(original, replacement);
      if (experiencePlaceholders.includes(original)) filledCount += 1;
    }
  }

  // Safety net: if the model missed a source-needed line for any reason,
  // fall back to a plain tag strip so nothing ships with a raw tag visible.
  updated = updated.replace(/\s*\[SOURCE NEEDED\]/g, '').replace(/ +([.,;)])/g, '$1').replace(/ {2,}/g, ' ');

  return { bodyMarkdown: updated, filledCount };
}

const TRANSLATE_TOOL = {
  name: 'submit_translations',
  description: 'Submit a Korean translation for each hint, in the same order given.',
  input_schema: {
    type: 'object',
    properties: {
      translations: { type: 'array', items: { type: 'string' } },
    },
    required: ['translations'],
  },
};

// Translates Agent 2's English placeholder hints to Korean for display in
// the Telegram notification — the draft itself stays English, this is
// purely so the author can read what's being asked without another
// round-trip through a translator.
export async function translateHintsToKorean(hints) {
  if (hints.length === 0) return [];

  const result = await callClaudeForStructuredOutput({
    system: 'Translate each English hint into a short, natural Korean question or prompt that a Korean-speaking blog author would understand at a glance. One short sentence per hint. Return translations in the same order as the hints.',
    userMessage: JSON.stringify({ hints }),
    tool: TRANSLATE_TOOL,
  });

  return result.translations?.length === hints.length ? result.translations : hints;
}

// Individual QA checks for Agent 4. Each returns { name, status, message }
// where status is 'pass' | 'warn' | 'fail'. Kept independent of Agent 2's
// prompt so this is a real second opinion, not just re-reading the same rules.

import { textOverlap, significantWords } from './similarity.mjs';

const BANNED_PHRASES = [
  'delve into', "in today's fast-paced world", 'moreover', 'furthermore',
  "it's important to note", 'unlock the power of', 'in conclusion',
  'game-changer', 'in the ever-evolving landscape',
];

function countWords(markdown) {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ');
  return stripped.split(/\s+/).filter(Boolean).length;
}

export function checkWordCount(body) {
  const words = countWords(body);
  if (words < 900) {
    return { name: 'word_count', status: 'fail', message: `Only ${words} words (target 1200-1800, hard floor 900).` };
  }
  if (words > 2200) {
    return { name: 'word_count', status: 'warn', message: `${words} words — noticeably over the 1200-1800 target, consider trimming.` };
  }
  if (words < 1200 || words > 1800) {
    return { name: 'word_count', status: 'warn', message: `${words} words — outside the 1200-1800 target but not a hard failure.` };
  }
  return { name: 'word_count', status: 'pass', message: `${words} words.` };
}

export function checkHeadingStructure(body) {
  const h2s = body.split('\n').filter((l) => l.startsWith('## '));
  const hasFaq = h2s.some((h) => /faq|frequently asked/i.test(h));
  if (h2s.length < 3) {
    return { name: 'heading_structure', status: 'fail', message: `Only ${h2s.length} H2 section(s) — target is 3-6.` };
  }
  if (h2s.length > 6) {
    return { name: 'heading_structure', status: 'warn', message: `${h2s.length} H2 sections — more than the 3-6 target.` };
  }
  if (!hasFaq) {
    return { name: 'heading_structure', status: 'warn', message: `${h2s.length} H2 sections, but no FAQ section found.` };
  }
  return { name: 'heading_structure', status: 'pass', message: `${h2s.length} H2 sections, FAQ present.` };
}

export function checkHasTableOrList(body) {
  const hasTable = /^\s*\|.+\|/m.test(body);
  const hasNumberedList = /^\d+\.\s/m.test(body);
  if (!hasTable && !hasNumberedList) {
    return { name: 'table_or_list', status: 'warn', message: 'No markdown table or numbered list found — comparison/review posts usually want one.' };
  }
  return { name: 'table_or_list', status: 'pass', message: hasTable ? 'Table present.' : 'Numbered list present.' };
}

export function checkBannedPhrases(body) {
  const lower = body.toLowerCase();
  const found = BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
  if (found.length > 0) {
    return { name: 'banned_phrases', status: 'fail', message: `Found AI-tell phrase(s): ${found.join(', ')}` };
  }
  return { name: 'banned_phrases', status: 'pass', message: 'No banned phrases found.' };
}

export function checkExperiencePlaceholders(body) {
  const matches = [...body.matchAll(/\[EXPERIENCE:[^\]]*\]/g)];
  if (matches.length === 0) {
    return { name: 'experience_placeholders', status: 'warn', message: 'No [EXPERIENCE: ...] placeholders — post may read as generic/impersonal.' };
  }
  if (matches.length > 6) {
    return { name: 'experience_placeholders', status: 'warn', message: `${matches.length} placeholders — unusually high, consider consolidating.` };
  }
  return {
    name: 'experience_placeholders',
    status: 'pass',
    message: `${matches.length} placeholder(s) for the human reviewer to fill in.`,
  };
}

export function checkSourceNeededTags(body) {
  const matches = [...body.matchAll(/\[SOURCE NEEDED\]/g)];
  return {
    name: 'source_needed_tags',
    status: matches.length > 0 ? 'warn' : 'pass',
    message: matches.length > 0
      ? `${matches.length} claim(s) flagged [SOURCE NEEDED] — verify before publishing.`
      : 'No unverified factual claims flagged.',
  };
}

export function checkMetaFields(data) {
  const problems = [];
  if (!data.title || data.title.length > 60) problems.push(`title is ${data.title?.length ?? 0} chars (max 60)`);
  if (!data.description || data.description.length > 155) problems.push(`description is ${data.description?.length ?? 0} chars (max 155)`);
  if (data.description && data.title && data.description.trim() === data.title.trim()) {
    problems.push('description just repeats the title');
  }
  if (!data.tags || data.tags.length < 2 || data.tags.length > 6) {
    problems.push(`${data.tags?.length ?? 0} tags (want 2-6)`);
  }
  if (problems.length > 0) {
    return { name: 'meta_fields', status: 'fail', message: problems.join('; ') };
  }
  return { name: 'meta_fields', status: 'pass', message: 'Title, description, and tags are within limits.' };
}

export function checkDuplicateTopic(data, otherPosts) {
  if (significantWords(data.title ?? '').length === 0) {
    return { name: 'duplicate_topic', status: 'pass', message: 'No title to compare.' };
  }

  let best = { slug: null, overlap: 0 };
  for (const other of otherPosts) {
    const overlap = textOverlap(data.title, other.data?.title);
    if (overlap > best.overlap) best = { slug: other.slug, overlap };
  }

  if (best.overlap >= 0.7) {
    return {
      name: 'duplicate_topic',
      status: 'warn',
      message: `Title overlaps ${Math.round(best.overlap * 100)}% with existing post "${best.slug}" — check for duplicate coverage.`,
    };
  }
  return { name: 'duplicate_topic', status: 'pass', message: 'No close title match among existing posts.' };
}

export function runAllChecks(data, body, otherPosts) {
  return [
    checkMetaFields(data),
    checkWordCount(body),
    checkHeadingStructure(body),
    checkHasTableOrList(body),
    checkBannedPhrases(body),
    checkExperiencePlaceholders(body),
    checkSourceNeededTags(body),
    checkDuplicateTopic(data, otherPosts),
  ];
}

export function overallStatus(checks) {
  if (checks.some((c) => c.status === 'fail')) return 'fail';
  if (checks.some((c) => c.status === 'warn')) return 'needs_review';
  return 'pass';
}

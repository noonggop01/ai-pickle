const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at',
  'is', 'are', 'was', 'were', 'be', 'been', 'with', 'that', 'this', 'it',
  'your', 'you', 'what', 'how', 'why', 'vs', 'ai',
]);

// Minimal suffix stripping so "migrating" and "migrations" count as the
// same word for overlap purposes — not a real stemmer, just enough to catch
// the common noun/verb-form mismatches between a raw HN headline and a
// polished title covering the same story.
function stem(word) {
  if (word.length <= 4) return word;
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('ions') && word.length > 7) return word.slice(0, -4);
  if (word.endsWith('ies') && word.length > 5) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
  return word;
}

export function significantWords(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

// Word-overlap ratio (0-1) between two short strings (titles, topic phrases).
// Not semantic similarity — just a cheap, dependency-free heuristic for
// "these are probably about the same thing."
export function textOverlap(a, b) {
  const wordsA = new Set(significantWords(a ?? ''));
  const wordsB = new Set(significantWords(b ?? ''));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  return intersection / Math.min(wordsA.size, wordsB.size);
}

// Minimal frontmatter line editor for the controlled format Agent 2 writes
// (every value is a valid JSON literal, one field per line). This is NOT a
// general YAML parser — it only supports reading/inserting/updating single
// top-level fields by name, which is all the agents need.

export function splitFrontmatter(fileText) {
  const lines = fileText.split('\n');
  if (lines[0] !== '---') {
    throw new Error('File has no frontmatter (expected it to start with "---").');
  }
  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) {
    throw new Error('Frontmatter block is not closed with a second "---".');
  }
  return {
    frontmatterLines: lines.slice(1, endIndex),
    body: lines.slice(endIndex + 1).join('\n'),
  };
}

export function getFrontmatterField(frontmatterLines, key) {
  const line = frontmatterLines.find((l) => l.startsWith(`${key}:`));
  if (!line) return undefined;
  const raw = line.slice(line.indexOf(':') + 1).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // e.g. an unquoted date like 2026-07-16
  }
}

// Inserts the field before `draft:` if present (keeps that flag last and
// visually prominent), otherwise appends it.
export function setFrontmatterField(frontmatterLines, key, valueLiteral) {
  const line = `${key}: ${valueLiteral}`;
  const existingIndex = frontmatterLines.findIndex((l) => l.startsWith(`${key}:`));
  if (existingIndex !== -1) {
    frontmatterLines[existingIndex] = line;
    return frontmatterLines;
  }
  const draftIndex = frontmatterLines.findIndex((l) => l.startsWith('draft:'));
  if (draftIndex === -1) {
    frontmatterLines.push(line);
  } else {
    frontmatterLines.splice(draftIndex, 0, line);
  }
  return frontmatterLines;
}

export function joinFrontmatter(frontmatterLines, body) {
  return `---\n${frontmatterLines.join('\n')}\n---\n${body}`;
}

import { getFrontmatterField, splitFrontmatter } from './frontmatter.mjs';

const unresolvedPattern = /\[(?:EXPERIENCE|SOURCE NEEDED)(?::|\])/i;

export function inspectPost(fileText, fileName = 'post.md') {
  const errors = [];
  const warnings = [];
  let parsed;

  try {
    parsed = splitFrontmatter(fileText);
  } catch (error) {
    return { errors: [`${fileName}: ${error.message}`], warnings, data: null };
  }

  const { frontmatterLines, body } = parsed;
  const data = {
    title: getFrontmatterField(frontmatterLines, 'title'),
    description: getFrontmatterField(frontmatterLines, 'description'),
    heroImage: getFrontmatterField(frontmatterLines, 'heroImage'),
    heroImageAlt: getFrontmatterField(frontmatterLines, 'heroImageAlt'),
    sourceUrl: getFrontmatterField(frontmatterLines, 'sourceUrl'),
    draft: getFrontmatterField(frontmatterLines, 'draft'),
  };

  // Astro treats a missing draft flag as published, so this validator does too.
  if (data.draft === true) return { errors, warnings, data };

  if (!data.title) errors.push(`${fileName}: published post is missing a title.`);
  if (!data.description) errors.push(`${fileName}: published post is missing a description.`);
  if (unresolvedPattern.test(fileText)) {
    errors.push(`${fileName}: published post still contains an EXPERIENCE or SOURCE NEEDED marker.`);
  }
  if (data.heroImage && !data.heroImageAlt) {
    errors.push(`${fileName}: heroImage requires descriptive heroImageAlt text.`);
  }

  if (data.sourceUrl) {
    try {
      const source = new URL(data.sourceUrl);
      if (!['http:', 'https:'].includes(source.protocol)) throw new Error('unsupported protocol');
    } catch {
      errors.push(`${fileName}: sourceUrl must be a valid http(s) URL.`);
    }
  } else {
    warnings.push(`${fileName}: no primary source URL is recorded.`);
  }

  if (!body.trim()) errors.push(`${fileName}: published post has no body content.`);

  return { errors, warnings, data };
}

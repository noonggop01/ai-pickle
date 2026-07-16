#!/usr/bin/env node
// Agent 3 — Images
//
// Reads a draft written by Agent 2 (plus its <slug>.images.json sidecar),
// generates a hero image and a couple of inline images, saves them under
// public/images/blog/<slug>/, and updates the post's frontmatter/body to
// reference them.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateImageBuffer } from '../lib/image-provider.mjs';
import { splitFrontmatter, getFrontmatterField, setFrontmatterField, joinFrontmatter } from '../lib/frontmatter.mjs';
import { findLatestPostSlug } from '../lib/latest-post.mjs';

// Keep in sync with `base` in astro.config.mjs — literal image paths inside
// the Markdown body aren't rewritten by Astro at build time, unlike the
// `heroImage` frontmatter field (which goes through the withBase() helper).
const BASE_PATH = '/ai-pickle';

const MAX_INLINE_IMAGES = 2;

function parseArgs(argv) {
  const args = { slug: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug') args.slug = argv[++i];
  }
  return args;
}

function insertAfterIntro(bodyLines, imageMarkdown) {
  const idx = bodyLines.findIndex((l) => l.trim() === '');
  const insertAt = idx === -1 ? bodyLines.length : idx + 1;
  bodyLines.splice(insertAt, 0, imageMarkdown, '');
  return true;
}

function insertAfterMatchingHeading(bodyLines, concept, placement, imageMarkdown) {
  const words = `${concept} ${placement}`
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (!line.startsWith('## ')) continue;
    const headingText = line.slice(3).toLowerCase();
    if (words.some((w) => headingText.includes(w))) {
      bodyLines.splice(i + 1, 0, '', imageMarkdown, '');
      return true;
    }
  }
  return false;
}

function insertNearTable(bodyLines, imageMarkdown) {
  const idx = bodyLines.findIndex((l) => l.trim().startsWith('|'));
  if (idx === -1) return false;
  let end = idx;
  while (end < bodyLines.length && bodyLines[end].trim().startsWith('|')) end++;
  bodyLines.splice(end, 0, '', imageMarkdown, '');
  return true;
}

function insertInlineImage(bodyLines, suggestion, imageMarkdown) {
  const placementLower = (suggestion.placement || '').toLowerCase();
  if (placementLower.includes('intro')) {
    return insertAfterIntro(bodyLines, imageMarkdown);
  }
  if (placementLower.includes('table')) {
    return insertNearTable(bodyLines, imageMarkdown) || insertAfterMatchingHeading(bodyLines, suggestion.concept, suggestion.placement, imageMarkdown);
  }
  return (
    insertAfterMatchingHeading(bodyLines, suggestion.concept, suggestion.placement, imageMarkdown) ||
    insertNearTable(bodyLines, imageMarkdown)
  );
}

async function main() {
  const { slug: slugArg } = parseArgs(process.argv.slice(2));
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const slug = slugArg ?? (await findLatestPostSlug(blogDir));

  const mdPath = path.join(blogDir, `${slug}.md`);
  const sidecarPath = path.join(blogDir, `${slug}.images.json`);

  console.error(`Generating images for: ${slug}`);

  const fileText = await readFile(mdPath, 'utf-8');
  const { frontmatterLines, body } = splitFrontmatter(fileText);

  const title = getFrontmatterField(frontmatterLines, 'title') ?? slug;
  const existingHeroImage = getFrontmatterField(frontmatterLines, 'heroImage');
  const heroImageAlt = getFrontmatterField(frontmatterLines, 'heroImageAlt') ?? title;

  let sidecar = { heroImageAlt, imageSuggestions: [] };
  try {
    sidecar = JSON.parse(await readFile(sidecarPath, 'utf-8'));
  } catch {
    console.error(`No sidecar found at ${path.relative(process.cwd(), sidecarPath)} — generating a hero image only, from the title.`);
  }

  const outDir = path.join(process.cwd(), 'public', 'images', 'blog', slug);
  await mkdir(outDir, { recursive: true });

  // Hero image
  if (existingHeroImage) {
    console.error(`heroImage already set (${existingHeroImage}) — skipping hero generation.`);
  } else {
    const heroPrompt = `${sidecar.heroImageAlt || heroImageAlt}, editorial blog header illustration, clean modern flat style, no text, no watermark`;
    console.error(`Generating hero image: "${heroPrompt}"`);
    const { buffer, extension } = await generateImageBuffer(heroPrompt, { width: 1200, height: 630 });
    const heroFilename = `hero.${extension}`;
    await writeFile(path.join(outDir, heroFilename), buffer);
    setFrontmatterField(frontmatterLines, 'heroImage', JSON.stringify(`/images/blog/${slug}/${heroFilename}`));
    console.error(`Saved public/images/blog/${slug}/${heroFilename}`);
  }

  // Inline images
  const bodyLines = body.split('\n');
  const suggestions = (sidecar.imageSuggestions ?? []).slice(0, MAX_INLINE_IMAGES);

  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    const prompt = `${suggestion.concept}, editorial blog illustration, clean modern flat style, no text, no watermark`;
    console.error(`Generating inline image ${i + 1}/${suggestions.length}: "${prompt}"`);
    const { buffer, extension } = await generateImageBuffer(prompt, { width: 1000, height: 560 });
    const filename = `inline-${i + 1}.${extension}`;
    await writeFile(path.join(outDir, filename), buffer);

    const imageMarkdown = `![${suggestion.altText ?? suggestion.concept}](${BASE_PATH}/images/blog/${slug}/${filename})`;
    const inserted = insertInlineImage(bodyLines, suggestion, imageMarkdown);

    if (inserted) {
      console.error(`Inserted near "${suggestion.placement}"`);
    } else {
      console.error(`Could not find a good spot for "${suggestion.placement}" — saved to ${filename}, add manually: ${imageMarkdown}`);
    }
  }

  const updatedFile = joinFrontmatter(frontmatterLines, bodyLines.join('\n'));
  await writeFile(mdPath, updatedFile, 'utf-8');

  console.error(`\nDone. Updated ${path.relative(process.cwd(), mdPath)}`);
}

main().catch((err) => {
  console.error('Image agent failed:', err.message);
  process.exit(1);
});

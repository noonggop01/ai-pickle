import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPost } from './lib/content-validation.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(repoRoot, 'src', 'content', 'blog');
const files = (await readdir(contentDir)).filter((name) => name.endsWith('.md')).sort();
const errors = [];
const warnings = [];

for (const fileName of files) {
  const fileText = await readFile(path.join(contentDir, fileName), 'utf8');
  const result = inspectPost(fileText, fileName);
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  if (result.data?.draft !== true && result.data?.heroImage) {
    const imagePath = path.join(repoRoot, 'public', result.data.heroImage.replace(/^\/+/, ''));
    try {
      await access(imagePath);
    } catch {
      errors.push(`${fileName}: hero image file does not exist at ${result.data.heroImage}.`);
    }
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.error(`\nContent validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${files.length} posts (${warnings.length} warning(s), 0 errors).`);
}

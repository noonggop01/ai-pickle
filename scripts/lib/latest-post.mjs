import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export async function findLatestPostSlug(blogDir) {
  const files = (await readdir(blogDir)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) throw new Error(`No posts found in ${blogDir}.`);
  const withMtime = await Promise.all(
    files.map(async (f) => ({ f, mtime: (await stat(path.join(blogDir, f))).mtimeMs })),
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return withMtime[0].f.replace(/\.md$/, '');
}
